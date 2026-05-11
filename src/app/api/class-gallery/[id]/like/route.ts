import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const generationId = params.id;

  try {
    const existingLike = await prisma.galleryLike.findUnique({
      where: {
        userId_generationId: {
          userId,
          generationId
        }
      }
    });

    if (existingLike) {
      // Unlike
      await prisma.galleryLike.delete({
        where: { id: existingLike.id }
      });
      return NextResponse.json({ success: true, liked: false });
    } else {
      // Like
      await prisma.galleryLike.create({
        data: {
          userId,
          generationId
        }
      });
      return NextResponse.json({ success: true, liked: true });
    }
  } catch (error: any) {
    console.error('Like toggle error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
