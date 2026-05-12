import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get teacher's students
    const students = await prisma.user.findMany({
      where: { teacherId: session.user.id },
      select: { id: true }
    });
    const studentIds = students.map(s => s.id);

    // Fetch latest 50 generations
    const generations = await prisma.generation.findMany({
      where: {
        userId: { in: studentIds },
        outputImageUrl: { not: null } // Only successful ones
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { displayName: true, username: true } },
        model: { select: { name: true } }
      }
    });
    
    // Basic stats
    const totalCount = await prisma.generation.count({
        where: { userId: { in: studentIds } }
    });

    return NextResponse.json({ success: true, data: generations, totalCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
