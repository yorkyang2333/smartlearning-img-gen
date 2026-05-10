import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const generations = await prisma.generation.findMany({
      where: { 
        userId: session.user.id, 
        outputImageUrl: { not: null } 
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        outputImageUrl: true,
        prompt: true,
        createdAt: true,
      }
    });

    return NextResponse.json({ data: generations });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
