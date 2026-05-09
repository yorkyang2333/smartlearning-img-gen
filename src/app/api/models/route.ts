import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const models = await prisma.model.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { apiEndpoint: true }
    });

    const teacherConfigs = await prisma.teacherModelConfig.findMany({
      where: { teacherId: session.user.id }
    });

    const data = models.map(m => {
       const config = teacherConfigs.find(c => c.modelId === m.id);
       return { ...m, teacherEnabled: config ? config.enabled : true };
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    if (body.action === 'toggleConfig') {
       const { modelId, enabled } = body;
       await prisma.teacherModelConfig.upsert({
         where: { teacherId_modelId: { teacherId: session.user.id, modelId } },
         update: { enabled },
         create: { teacherId: session.user.id, modelId, enabled }
       });
       return NextResponse.json({ success: true });
    }

    if (body.action === 'create') {
      const { name, modelId, type, provider, description, config, apiEndpointId } = body.data;
      const newModel = await prisma.model.create({
        data: {
          name,
          modelId,
          type,
          provider,
          description,
          config: config || '{}',
          apiEndpointId: apiEndpointId || null,
        }
      });
      return NextResponse.json({ success: true, data: newModel });
    }

    if (body.action === 'update') {
      const { id, name, modelId, type, provider, description, config, apiEndpointId } = body.data;
      const updatedModel = await prisma.model.update({
        where: { id },
        data: {
          name,
          modelId,
          type,
          provider,
          description,
          config: config || '{}',
          apiEndpointId: apiEndpointId || null,
        }
      });
      return NextResponse.json({ success: true, data: updatedModel });
    }

    if (body.action === 'delete') {
      const { id } = body;
      await prisma.model.delete({
        where: { id }
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
