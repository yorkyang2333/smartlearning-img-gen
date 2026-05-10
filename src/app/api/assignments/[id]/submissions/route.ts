import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { generationId, note } = await req.json();

    const assignment = await prisma.assignment.findUnique({ where: { id } });
    if (!assignment || !assignment.isActive) {
      return NextResponse.json({ error: 'Assignment not active or not found' }, { status: 400 });
    }

    // Verify generation belongs to user
    const generation = await prisma.generation.findUnique({ where: { id: generationId } });
    if (!generation || generation.userId !== session.user.id) {
       return NextResponse.json({ error: 'Invalid generation' }, { status: 400 });
    }

    // Check if student already submitted max times
    const submissionCount = await prisma.assignmentSubmission.count({
      where: { assignmentId: id, studentId: session.user.id }
    });

    if (submissionCount >= assignment.maxSubmissions) {
      return NextResponse.json({ error: 'Max submissions reached' }, { status: 400 });
    }

    const submission = await prisma.assignmentSubmission.create({
      data: {
        assignmentId: id,
        studentId: session.user.id,
        generationId,
        note,
        status: 'SUBMITTED'
      }
    });

    return NextResponse.json({ success: true, data: submission });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
