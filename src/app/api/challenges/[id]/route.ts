import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const challenge = await prisma.challenge.findUnique({
      where: { id: params.id },
      include: {
        entries: {
          include: {
            student: { select: { id: true, displayName: true } },
            generation: true
          },
          orderBy: { submittedAt: 'asc' }
        }
      }
    });

    if (!challenge) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: challenge });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { status, title, theme, keywords, durationMin } = body;

    let dataToUpdate: any = { status, title, theme, durationMin };
    if (keywords !== undefined) {
      dataToUpdate.keywords = keywords ? JSON.stringify(keywords) : null;
    }
    
    if (status === 'ACTIVE') {
       dataToUpdate.startedAt = new Date();
    } else if (status === 'ENDED') {
       dataToUpdate.endedAt = new Date();
    }

    const challenge = await prisma.challenge.update({
      where: { id: params.id },
      data: dataToUpdate
    });

    return NextResponse.json({ success: true, data: challenge });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
