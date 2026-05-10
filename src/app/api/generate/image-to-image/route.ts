import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { imageToImage } from '@/lib/api-client';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const prompt = formData.get('prompt') as string;
    const modelId = formData.get('modelId') as string;
    const size = formData.get('size') as string;
    const image = formData.get('image') as File;
    const conversationId = formData.get('conversationId') as string | null;

    if (!prompt || !modelId || !image) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validation: Check if model exists and is enabled
    const model = await prisma.model.findUnique({
      where: { modelId },
      include: { apiEndpoint: true }
    });

    if (!model || !model.isActive || model.type === 'TEXT_TO_IMAGE') {
      return NextResponse.json({ error: 'Invalid or disabled model for image-to-image' }, { status: 400 });
    }
    
    if (!model.apiEndpoint) {
      return NextResponse.json({ error: '此模型尚未配置 API 渠道，无法生成。' }, { status: 400 });
    }

    // Validation: Check permissions (simplified for brevity, identical to text-to-image)
    if (session.user.role === 'STUDENT') {
      const student = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          teacher: { include: { modelConfigs: true } },
          modelOverrides: true
        }
      });

      if (!student || !student.teacher) {
        return NextResponse.json({ error: 'Student has no assigned teacher' }, { status: 403 });
      }

      const override = student.modelOverrides.find(o => o.modelId === model.id);
      if (override && !override.allowed) return NextResponse.json({ error: 'Model not allowed' }, { status: 403 });
      
      if (!override) {
         const teacherConfig = student.teacher.modelConfigs.find(c => c.modelId === model.id);
         if (teacherConfig && !teacherConfig.enabled) return NextResponse.json({ error: 'Model disabled by teacher' }, { status: 403 });
      }

      // Quota Check
      const quota = await prisma.quotaConfig.findUnique({ where: { teacherId: student.teacherId } });
      if (quota) {
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
    
    // Call API Endpoint
    const response = await imageToImage({
      image,
      prompt,
      model: modelId,
      size,
      apiUrl: model.apiEndpoint.baseUrl,
      apiKey: model.apiEndpoint.apiKey,
    });

    const durationMs = Date.now() - startTime;

    let outputImageUrl = null;
    if (response.data && response.data.length > 0) {
      if (response.data[0].b64_json) {
        outputImageUrl = `data:image/png;base64,${response.data[0].b64_json}`;
      } else {
        outputImageUrl = response.data[0].url;
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
        type: 'IMAGE_TO_IMAGE',
        prompt,
        size,
        outputImageUrl,
        durationMs,
        apiResponse: JSON.stringify(response),
      }
    });

    return NextResponse.json({ success: true, data: generation, rawUrl: outputImageUrl, conversationId: targetConversationId });
  } catch (error: any) {
    console.error('Image to Image Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
