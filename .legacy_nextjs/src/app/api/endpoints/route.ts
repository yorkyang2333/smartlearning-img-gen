import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const endpoints = await prisma.apiEndpoint.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
         _count: {
            select: { models: true }
         }
      }
    });

    return NextResponse.json({ success: true, data: endpoints });
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

    const body = await req.json();

    if (body.action === 'create') {
      const { name, baseUrl, apiKey } = body.data;
      const newEndpoint = await prisma.apiEndpoint.create({
        data: { name, baseUrl, apiKey }
      });
      return NextResponse.json({ success: true, data: newEndpoint });
    }

    if (body.action === 'update') {
      const { id } = body;
      const { name, baseUrl, apiKey } = body.data;
      const updatedEndpoint = await prisma.apiEndpoint.update({
        where: { id },
        data: { name, baseUrl, apiKey }
      });
      return NextResponse.json({ success: true, data: updatedEndpoint });
    }

    if (body.action === 'delete') {
      const { id } = body;
      
      // Prevent deleting if models are attached
      const count = await prisma.model.count({ where: { apiEndpointId: id } });
      if (count > 0) {
         return NextResponse.json({ error: '无法删除：仍有模型绑定在此渠道。请先解除绑定。' }, { status: 400 });
      }
      
      await prisma.apiEndpoint.delete({
        where: { id }
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
