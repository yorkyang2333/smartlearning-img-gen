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

    let teacherId = session.user.id;
    if (session.user.role === 'STUDENT') {
      const student = await prisma.user.findUnique({ where: { id: session.user.id } });
      if (!student?.teacherId) return NextResponse.json({ success: true, data: [] });
      teacherId = student.teacherId;
    }

    // Find all submissions that are reviewed and have a high score?
    // Or just all recent generations from the class. Let's return recent generations from the class.
    const students = await prisma.user.findMany({
      where: { teacherId },
      select: { id: true }
    });
    const studentIds = students.map(s => s.id);

    const gallery = await prisma.generation.findMany({
      where: { 
        userId: { in: studentIds },
        outputImageUrl: { not: null }
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
      include: {
        user: { select: { displayName: true, username: true } },
        model: { select: { name: true } }
      }
    });

    return NextResponse.json({ success: true, data: gallery });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
