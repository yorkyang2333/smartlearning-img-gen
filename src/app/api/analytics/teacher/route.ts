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

    // Get students
    const students = await prisma.user.findMany({
      where: { teacherId: session.user.id },
      select: { id: true, displayName: true }
    });
    const studentIds = students.map(s => s.id);

    // Get all generations for the students
    const generations = await prisma.generation.findMany({
      where: { userId: { in: studentIds } },
      select: { id: true, userId: true, modelId: true, durationMs: true, createdAt: true, prompt: true }
    });

    // Total generations
    const totalGenerations = generations.length;

    // Active students today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeStudentsToday = new Set(
        generations.filter(g => new Date(g.createdAt) >= today).map(g => g.userId)
    ).size;

    // Model distribution
    const models = await prisma.model.findMany({ select: { id: true, name: true } });
    const modelNameMap = Object.fromEntries(models.map(m => [m.id, m.name]));

    const modelDistribution: Record<string, number> = {};
    for (const g of generations) {
       const name = modelNameMap[g.modelId] || g.modelId;
       modelDistribution[name] = (modelDistribution[name] || 0) + 1;
    }

    // Daily trend (last 7 days)
    const dailyTrend: Record<string, number> = {};
    for (let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dailyTrend[d.toISOString().split('T')[0]] = 0;
    }
    for (const g of generations) {
       const dateStr = new Date(g.createdAt).toISOString().split('T')[0];
       if (dailyTrend[dateStr] !== undefined) {
           dailyTrend[dateStr]++;
       }
    }

    return NextResponse.json({ 
        success: true, 
        data: {
            totalGenerations,
            activeStudentsToday,
            totalStudents: students.length,
            modelDistribution,
            dailyTrend
        } 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
