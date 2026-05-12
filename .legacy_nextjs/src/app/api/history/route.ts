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
    const studentId = searchParams.get('studentId');

    let whereClause: any = {};

    if (session.user.role === 'STUDENT') {
      whereClause.userId = session.user.id;
    } else if (session.user.role === 'TEACHER') {
      if (studentId) {
         // Verify this student belongs to this teacher
         const student = await prisma.user.findUnique({ where: { id: studentId }});
         if (student?.teacherId !== session.user.id) {
            return NextResponse.json({ error: 'Unauthorized access to student' }, { status: 403 });
         }
         whereClause.userId = studentId;
      } else {
         // Get history of all students of this teacher
         whereClause.user = { teacherId: session.user.id };
      }
    }

    const history = await prisma.generation.findMany({
      where: whereClause,
      include: {
         model: { select: { name: true, provider: true } },
         user: { select: { displayName: true, username: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100 // Limit for now
    });

    return NextResponse.json({ success: true, data: history });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
