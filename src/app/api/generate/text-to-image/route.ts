import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { textToImage } from '@/lib/api-client';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { prompt, modelId, size, n, quality } = body;

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
    }

    const startTime = Date.now();
    
    // Call API Endpoint
    const response = await textToImage({
      prompt,
      model: modelId,
      size,
      n,
      quality,
      apiUrl: model.apiEndpoint.baseUrl,
      apiKey: model.apiEndpoint.apiKey,
    });

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

    // Save generation to history
    const generation = await prisma.generation.create({
      data: {
        userId: session.user.id,
        modelId: model.id,
        type: 'TEXT_TO_IMAGE',
        prompt,
        size,
        quality,
        outputImageUrl,
        durationMs,
        apiResponse: JSON.stringify(response),
      }
    });

    return NextResponse.json({ success: true, data: generation, rawUrl: outputImageUrl });
  } catch (error: any) {
    console.error('Text to Image Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
