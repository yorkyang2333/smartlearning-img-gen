import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { textToImage, analyzePromptWithLLM } from '@/lib/api-client';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { prompt, modelId, size, n, quality, conversationId } = body;

    if (!prompt || !modelId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validation: Check if model exists and is enabled
    const model = await prisma.model.findUnique({
      where: { modelId },
      include: { apiEndpoint: true }
    });

    if (!model || !model.isActive || model.type === 'IMAGE_TO_IMAGE') {
      return NextResponse.json({ error: 'Invalid or disabled model' }, { status: 400 });
    }
    
    if (!model.apiEndpoint) {
      return NextResponse.json({ error: '此模型尚未配置 API 渠道，无法生成。' }, { status: 400 });
    }

    // Validation: Check if student has permission for this model
    if (session.user.role === 'STUDENT') {
      const student = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          teacher: {
            include: {
              modelConfigs: true
            }
          },
          modelOverrides: true
        }
      });

      if (!student || !student.teacher) {
        return NextResponse.json({ error: 'Student has no assigned teacher' }, { status: 403 });
      }

      // Check override first
      const override = student.modelOverrides.find(o => o.modelId === model.id);
      if (override && !override.allowed) {
         return NextResponse.json({ error: 'Model not allowed by teacher override' }, { status: 403 });
      }

      // If no override, check teacher's global config
      if (!override) {
         const teacherConfig = student.teacher.modelConfigs.find(c => c.modelId === model.id);
         if (teacherConfig && !teacherConfig.enabled) {
            return NextResponse.json({ error: 'Model not enabled by teacher' }, { status: 403 });
         }
      }

      // Quota Check and Blocked Words Check
      const quota = await prisma.quotaConfig.findUnique({ where: { teacherId: student.teacherId } });
      if (quota) {
        // Blocked words
        if (quota.blockedWords) {
          const blocked = JSON.parse(quota.blockedWords);
          for (const word of blocked) {
            if (prompt.toLowerCase().includes(word.toLowerCase())) {
              return NextResponse.json({ error: `提示词包含不当内容 (${word})，请修改后重试。` }, { status: 400 });
            }
          }
        }

        // Daily Limit
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const count = await prisma.generation.count({
          where: {
            userId: session.user.id,
            createdAt: { gte: today }
          }
        });
        if (count >= quota.dailyLimit) {
          return NextResponse.json({ error: `已达到每日生成上限 (${quota.dailyLimit}次)` }, { status: 403 });
        }
      }
    }

    const startTime = Date.now();
    
    let teacherIdForTutor = session.user.id;
    if (session.user.role === 'STUDENT') {
      const studentData = await prisma.user.findUnique({ where: { id: session.user.id }, select: { teacherId: true } });
      if (studentData?.teacherId) teacherIdForTutor = studentData.teacherId;
    }

    const tutorConfig = await prisma.tutorConfig.findUnique({
       where: { teacherId: teacherIdForTutor },
       include: { apiEndpoint: true }
    });
    
    let analysisPromise = Promise.resolve(null);
    if (tutorConfig && tutorConfig.enabled && tutorConfig.apiEndpoint) {
       analysisPromise = analyzePromptWithLLM(
         prompt, 
         tutorConfig.apiEndpoint.baseUrl, 
         tutorConfig.apiEndpoint.apiKey,
         tutorConfig.modelName,
         tutorConfig.systemPrompt
       ).catch(e => {
          console.error("Prompt analysis failed:", e);
          return null; // fallback gracefully
       });
    }

    const [response, analysisResult] = await Promise.all([
      textToImage({
        prompt,
        model: modelId,
        size,
        n,
        quality,
        apiUrl: model.apiEndpoint.baseUrl,
        apiKey: model.apiEndpoint.apiKey,
      }),
      analysisPromise
    ]);

    const durationMs = Date.now() - startTime;

    // Extract image URL (could be from data array or choices for chat models)
    let outputImageUrl = null;
    if (response.data && response.data.length > 0) {
      if (response.data[0].b64_json) {
        outputImageUrl = `data:image/png;base64,${response.data[0].b64_json}`;
      } else {
        outputImageUrl = response.data[0].url;
      }
    } else if (response.choices && response.choices.length > 0) {
       // Try to extract image link from markdown if model returned chat
       const content = response.choices[0].message.content;
       const match = content.match(/!\[.*?\]\((.*?)\)/);
       if (match) {
          outputImageUrl = match[1];
       } else {
          outputImageUrl = content; // fallback
       }
    }

    // Handle conversation
    let targetConversationId = conversationId;
    if (!targetConversationId) {
      // Create a new conversation using the prompt as the title (max 20 chars)
      const newConversation = await prisma.conversation.create({
        data: {
          userId: session.user.id,
          title: prompt.substring(0, 20) + (prompt.length > 20 ? '...' : ''),
        }
      });
      targetConversationId = newConversation.id;
    } else {
      // Touch the conversation to update its updatedAt timestamp
      await prisma.conversation.update({
        where: { id: targetConversationId },
        data: { updatedAt: new Date() }
      });
    }

    // Save generation to history
    const generation = await prisma.generation.create({
      data: {
        userId: session.user.id,
        modelId: model.id,
        conversationId: targetConversationId,
        type: 'TEXT_TO_IMAGE',
        prompt,
        size,
        quality,
        outputImageUrl,
        durationMs,
        apiResponse: JSON.stringify({ response, analysis: analysisResult }),
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: generation, 
      rawUrl: outputImageUrl, 
      conversationId: targetConversationId,
      analysis: analysisResult 
    });
  } catch (error: any) {
    console.error('Text to Image Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
