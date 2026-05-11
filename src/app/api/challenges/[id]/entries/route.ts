import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { generationId } = body;

    const challenge = await prisma.challenge.findUnique({
      where: { id: params.id }
    });

    if (!challenge || challenge.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Challenge is not active' }, { status: 400 });
    }

    // Ensure the student hasn't already submitted
    const existingEntry = await prisma.challengeEntry.findFirst({
      where: {
        challengeId: params.id,
        studentId: session.user.id
      }
    });

    if (existingEntry) {
      return NextResponse.json({ error: 'You have already submitted an entry for this challenge' }, { status: 400 });
    }

    const entry = await prisma.challengeEntry.create({
      data: {
        challengeId: params.id,
        studentId: session.user.id,
        generationId
      }
    });

    return NextResponse.json({ success: true, data: entry });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
