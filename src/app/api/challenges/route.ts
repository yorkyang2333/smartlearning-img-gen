import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let whereClause: any = {};
    if (session.user.role === 'TEACHER') {
      whereClause.teacherId = session.user.id;
    } else {
      // Student sees challenges from their teacher
      const student = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { teacherId: true }
      });
      if (student?.teacherId) {
        whereClause.teacherId = student.teacherId;
      }
    }

    if (status) {
      whereClause.status = status;
    }

    const challenges = await prisma.challenge.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { entries: true }
        }
      }
    });

    return NextResponse.json({ success: true, data: challenges });
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
    const { title, theme, keywords, durationMin } = body;

    const challenge = await prisma.challenge.create({
      data: {
        teacherId: session.user.id,
        title,
        theme,
        keywords: keywords ? JSON.stringify(keywords) : null,
        durationMin: durationMin || 5,
        status: 'PENDING'
      }
    });

    return NextResponse.json({ success: true, data: challenge });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
