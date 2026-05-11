import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'TEACHER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { students } = await request.json();
    
    if (!students || !Array.isArray(students)) {
       return NextResponse.json({ error: 'Invalid students data' }, { status: 400 });
    }

    let successCount = 0;
    const errors = [];

    for (const student of students) {
      if (!student.username || !student.displayName || !student.password) {
         errors.push(`${student.username || 'unknown'} 数据不完整`);
         continue;
      }
      
      const existing = await prisma.user.findUnique({
        where: { username: student.username }
      });

      if (existing) {
        errors.push(`账号 ${student.username} 已存在`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(student.password, 10);
      
      await prisma.user.create({
        data: {
          username: student.username,
          displayName: student.displayName,
          password: hashedPassword,
          role: 'STUDENT',
        }
      });
      successCount++;
    }

    if (errors.length > 0 && successCount === 0) {
       return NextResponse.json({ error: '导入失败: ' + errors.join(', ') }, { status: 400 });
    }

    return NextResponse.json({ 
       success: true, 
       message: `成功导入 ${successCount} 名学生。` + (errors.length > 0 ? `部分失败: ${errors.join(', ')}` : '') 
    });
  } catch (error: any) {
    console.error('Batch import error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
