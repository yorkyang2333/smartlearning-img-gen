import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (session.user.role === 'TEACHER') {
      const assignments = await prisma.assignment.findMany({
        where: { teacherId: session.user.id },
        include: { _count: { select: { submissions: true } } },
        orderBy: { createdAt: 'desc' }
      });
      return NextResponse.json({ success: true, data: assignments });
    } else {
      // Student fetching their teacher's assignments
      const student = await prisma.user.findUnique({ where: { id: session.user.id } });
      if (!student?.teacherId) return NextResponse.json({ success: true, data: [] });
      
      const assignments = await prisma.assignment.findMany({
        where: { teacherId: student.teacherId, isActive: true },
        include: {
           submissions: {
              where: { studentId: session.user.id },
              select: { status: true, score: true }
           }
        },
        orderBy: { createdAt: 'desc' }
      });
      return NextResponse.json({ success: true, data: assignments });
    }
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

    const { title, description, requirements, allowedModelIds, allowedSizes, deadline } = await req.json();

    const assignment = await prisma.assignment.create({
      data: {
        teacherId: session.user.id,
        title,
        description,
        requirements: requirements ? JSON.stringify(requirements) : null,
        allowedModelIds: allowedModelIds ? JSON.stringify(allowedModelIds) : null,
        allowedSizes: allowedSizes ? JSON.stringify(allowedSizes) : null,
        deadline: deadline ? new Date(deadline) : null,
      }
    });

    return NextResponse.json({ success: true, data: assignment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
