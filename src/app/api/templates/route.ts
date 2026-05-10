import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let teacherId = session.user.id;
    if (session.user.role === 'STUDENT') {
      const student = await prisma.user.findUnique({ where: { id: session.user.id } });
      if (!student?.teacherId) return NextResponse.json({ success: true, data: [] });
      teacherId = student.teacherId;
    }

    const templates = await prisma.promptTemplate.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: templates });
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

    const { title, template, category, description } = await req.json();

    const newTemplate = await prisma.promptTemplate.create({
      data: {
        teacherId: session.user.id,
        title,
        template,
        category,
        description
      }
    });

    return NextResponse.json({ success: true, data: newTemplate });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
