import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string, submissionId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, submissionId } = await params;
    const { feedback, score } = await req.json();

    // Verify assignment belongs to teacher
    const assignment = await prisma.assignment.findUnique({ where: { id } });
    if (!assignment || assignment.teacherId !== session.user.id) {
       return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const submission = await prisma.assignmentSubmission.update({
      where: { id: submissionId, assignmentId: id },
      data: {
        feedback,
        score,
        status: 'REVIEWED'
      }
    });

    return NextResponse.json({ success: true, data: submission });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string, submissionId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, submissionId } = await params;

    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: { assignment: true }
    });

    if (!submission) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Check permissions
    if (session.user.role === 'STUDENT') {
      if (submission.studentId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (submission.status === 'REVIEWED') {
        return NextResponse.json({ error: '已评阅的作品不能撤回' }, { status: 400 });
      }
    } else if (session.user.role === 'TEACHER') {
      if (submission.assignment.teacherId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.assignmentSubmission.delete({
      where: { id: submissionId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
