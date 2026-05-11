import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const studentId = session.user.id;

  try {
    // 1. Total Generations
    const totalGenerations = await prisma.generation.count({
      where: { userId: studentId }
    });

    // 2. This week's generations
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const thisWeekCount = await prisma.generation.count({
      where: { 
        userId: studentId,
        createdAt: { gte: sevenDaysAgo }
      }
    });

    // 3. Top Model
    const modelUsage = await prisma.generation.groupBy({
      by: ['modelId'],
      where: { userId: studentId },
      _count: true,
      orderBy: { _count: 'desc' },
      take: 1
    });

    let topModel = '暂无';
    if (modelUsage.length > 0) {
      const model = await prisma.model.findUnique({
        where: { id: modelUsage[0].modelId }
      });
      topModel = model?.name || '未知模型';
    }

    // 4. Recent Assignments
    const recentSubmissions = await prisma.assignmentSubmission.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        assignment: {
          select: { title: true }
        }
      }
    });

    return NextResponse.json({
      data: {
        totalGenerations,
        thisWeekCount,
        topModel,
        recentSubmissions: recentSubmissions.map(sub => ({
          id: sub.id,
          assignmentTitle: sub.assignment.title,
          status: sub.status,
          score: sub.score,
          feedback: sub.feedback,
          createdAt: sub.createdAt
        }))
      }
    });
  } catch (error: any) {
    console.error('Student analytics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
