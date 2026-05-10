import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await prisma.quotaConfig.findUnique({
      where: { teacherId: session.user.id }
    });

    return NextResponse.json({ success: true, data: config });
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

    const { dailyLimit, weeklyLimit, blockedWords, activeHours } = await req.json();

    const config = await prisma.quotaConfig.upsert({
      where: { teacherId: session.user.id },
      update: {
        dailyLimit,
        weeklyLimit,
        blockedWords: blockedWords ? JSON.stringify(blockedWords) : null,
        activeHours: activeHours ? JSON.stringify(activeHours) : null,
      },
      create: {
        teacherId: session.user.id,
        dailyLimit: dailyLimit || 50,
        weeklyLimit,
        blockedWords: blockedWords ? JSON.stringify(blockedWords) : null,
        activeHours: activeHours ? JSON.stringify(activeHours) : null,
      }
    });

    return NextResponse.json({ success: true, data: config });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
