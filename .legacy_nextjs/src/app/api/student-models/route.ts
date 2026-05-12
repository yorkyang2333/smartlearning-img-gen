import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const student = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        teacher: {
          include: { modelConfigs: true }
        },
        modelOverrides: true
      }
    });

    if (!student || !student.teacher) {
       return NextResponse.json({ success: true, data: [] });
    }

    const allModels = await prisma.model.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });

    // Filter models based on teacher config and student overrides
    const allowedModels = allModels.filter(model => {
       const override = student.modelOverrides.find(o => o.modelId === model.id);
       if (override) return override.allowed;

       const teacherConfig = student.teacher?.modelConfigs.find(c => c.modelId === model.id);
       if (teacherConfig) return teacherConfig.enabled;

       return true; // default to true if no config exists
    });

    return NextResponse.json({ success: true, data: allowedModels });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
