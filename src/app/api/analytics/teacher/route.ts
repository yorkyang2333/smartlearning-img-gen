import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'TEACHER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Total Students
    const totalStudents = await prisma.user.count({
      where: { role: 'STUDENT' }
    });

    // 2. Total Generations
    const totalGenerations = await prisma.generation.count();

    // 3. Active Models (models used at least once)
    const activeModelsCount = await prisma.generation.groupBy({
      by: ['modelId'],
    });

    // 4. Daily Trend (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentGenerations = await prisma.generation.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo
        }
      },
      select: {
        createdAt: true
      }
    });

    const trendMap = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const dateStr = d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
      trendMap.set(dateStr, 0);
    }

    recentGenerations.forEach(gen => {
      const dateStr = new Date(gen.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
      if (trendMap.has(dateStr)) {
        trendMap.set(dateStr, trendMap.get(dateStr)! + 1);
      }
    });

    const dailyTrend = Array.from(trendMap.entries()).map(([date, count]) => ({ date, count }));

    // 5. Model Usage
    const modelGenerations = await prisma.generation.groupBy({
      by: ['modelId'],
      _count: true,
    });

    const models = await prisma.model.findMany({
      where: { id: { in: modelGenerations.map(m => m.modelId) } }
    });

    const modelUsage = modelGenerations.map(mg => {
      const model = models.find(m => m.id === mg.modelId);
      return {
        name: model?.name || 'Unknown',
        count: mg._count
      };
    }).sort((a, b) => b.count - a.count);

    return NextResponse.json({
      data: {
        totalStudents,
        totalGenerations,
        activeModels: activeModelsCount.length,
        dailyTrend,
        modelUsage
      }
    });
  } catch (error: any) {
    console.error('Teacher analytics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
