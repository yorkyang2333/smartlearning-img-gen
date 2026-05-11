import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');

  try {
    const generations = await prisma.generation.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      // Make sure we only get successful generations
      where: {
        outputImageUrl: { not: null }
      },
      include: {
        user: {
          select: { displayName: true }
        },
        model: {
          select: { name: true }
        },
        _count: {
          select: { likes: true }
        },
        likes: {
          where: { userId: session.user.id },
          select: { id: true }
        }
      }
    });

    const data = generations.map(gen => ({
      ...gen,
      hasLiked: gen.likes.length > 0,
      likeCount: gen._count.likes
    }));

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Class gallery error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
