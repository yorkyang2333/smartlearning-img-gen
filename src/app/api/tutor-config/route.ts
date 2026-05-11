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

    let config = await prisma.tutorConfig.findUnique({
      where: { teacherId: session.user.id }
    });

    if (!config) {
      config = await prisma.tutorConfig.create({
        data: {
          teacherId: session.user.id,
        }
      });
    }

    return NextResponse.json({ success: true, data: config });
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
    const { enabled, systemPrompt, modelName, apiEndpointId } = body;

    const config = await prisma.tutorConfig.upsert({
      where: { teacherId: session.user.id },
      update: {
        enabled,
        systemPrompt: systemPrompt || null,
        modelName,
        apiEndpointId: apiEndpointId || null,
      },
      create: {
        teacherId: session.user.id,
        enabled,
        systemPrompt: systemPrompt || null,
        modelName,
        apiEndpointId: apiEndpointId || null,
      }
    });

    return NextResponse.json({ success: true, data: config });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
