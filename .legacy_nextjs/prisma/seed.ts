import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const models = [
  {
    name: 'GPT Image 2',
    modelId: 'gpt-image-2',
    type: 'BOTH',
    provider: 'openai',
    description: '最新旗舰图像模型',
    sortOrder: 1,
    config: JSON.stringify({
      endpoint: '/v1/images/generations', // For variations/edits will be handled differently
      sizes: ['1024x1024', '1024x1792', '1792x1024', '768x1024', '1024x768', '1536x1024', '1024x1536'],
      supportsN: false,
    })
  },
  {
    name: 'GPT Image 1.5',
    modelId: 'gpt-image-1.5',
    type: 'BOTH',
    provider: 'openai',
    description: '均衡性能',
    sortOrder: 2,
    config: JSON.stringify({
      sizes: ['1024x1024', '1024x1792', '1792x1024', '768x1024', '1024x768', '1536x1024', '1024x1536'],
      supportsN: false,
    })
  },
  {
    name: 'GPT Image 1',
    modelId: 'gpt-image-1',
    type: 'BOTH',
    provider: 'openai',
    description: '经典模型',
    sortOrder: 3,
    config: JSON.stringify({
      sizes: ['1024x1024', '1024x1792', '1792x1024', '768x1024', '1024x768', '1536x1024', '1024x1536'],
      supportsN: false,
    })
  },
  {
    name: 'GPT Image 1 Mini',
    modelId: 'gpt-image-1-mini',
    type: 'BOTH',
    provider: 'openai',
    description: '低成本版',
    sortOrder: 4,
    config: JSON.stringify({
      sizes: ['1024x1024', '1024x1792', '1792x1024', '768x1024', '1024x768', '1536x1024', '1024x1536'],
      supportsN: false,
    })
  },
  {
    name: 'DALL·E 3',
    modelId: 'dall-e-3',
    type: 'TEXT_TO_IMAGE',
    provider: 'openai',
    description: '高质量文生图',
    sortOrder: 5,
    config: JSON.stringify({
      endpoint: '/v1/images/generations',
      sizes: ['1024x1024', '1024x1792'],
      qualities: ['standard', 'hd'],
      supportsN: true,
      maxN: 10
    })
  },
  {
    name: 'DALL·E 2',
    modelId: 'dall-e-2',
    type: 'BOTH',
    provider: 'openai',
    description: '支持图像变体',
    sortOrder: 6,
    config: JSON.stringify({
      endpoint: '/v1/images/generations',
      sizes: ['256x256', '512x512', '1024x1024'],
      supportsN: true,
      maxN: 10
    })
  },
  {
    name: 'Gemini Flash Image',
    modelId: 'gemini-2.5-flash-image-preview',
    type: 'TEXT_TO_IMAGE',
    provider: 'gemini',
    description: 'Google 生图模型',
    sortOrder: 7,
    config: JSON.stringify({
      endpoint: '/v1/chat/completions', // Actually requires chat endpoint wrapper
      supportsN: false,
    })
  },
  {
    name: 'Gemini 3 Pro Image',
    modelId: 'gemini-3-pro-image-preview',
    type: 'TEXT_TO_IMAGE',
    provider: 'gemini',
    description: 'Google 生图模型',
    sortOrder: 8,
    config: JSON.stringify({
      endpoint: '/v1/chat/completions',
      supportsN: false,
    })
  },
  {
    name: 'Gemini 3.1 Flash Image',
    modelId: 'gemini-3.1-flash-image-preview',
    type: 'TEXT_TO_IMAGE',
    provider: 'gemini',
    description: 'Google 生图模型',
    sortOrder: 9,
    config: JSON.stringify({
      endpoint: '/v1/chat/completions',
      supportsN: false,
    })
  }
];

async function main() {
  // Create default models
  console.log('Seeding models...');
  for (const m of models) {
    await prisma.model.upsert({
      where: { modelId: m.modelId },
      update: m,
      create: m,
    });
  }
  
  // Create admin teacher
  console.log('Seeding default teacher admin...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: hashedPassword,
      displayName: '管理员教师',
      role: 'TEACHER',
    },
  });

  const admin = await prisma.user.findUnique({ where: { username: 'admin' } });

  if (admin) {
    console.log('Seeding default smart learning data...');
    
    // Default Quota
    await prisma.quotaConfig.upsert({
      where: { teacherId: admin.id },
      update: {},
      create: {
        teacherId: admin.id,
        dailyLimit: 20,
        blockedWords: JSON.stringify(['血腥', '暴力', '色情', 'nsfw']),
      }
    });

    // Default Templates
    const templatesCount = await prisma.promptTemplate.count({ where: { teacherId: admin.id } });
    if (templatesCount === 0) {
      await prisma.promptTemplate.createMany({
        data: [
          {
            teacherId: admin.id,
            title: '基础风景构建',
            category: '风景',
            template: '一幅{季节}的{场景}风景画，天气是{天气}，采用{风格}风格，光线{光线}',
            description: '帮助学生学习如何描述一个完整的自然场景'
          },
          {
            teacherId: admin.id,
            title: '人物肖像',
            category: '人物',
            template: '一位{外貌特征}的{职业/角色}，穿着{服装}，背景是{背景}，采用{摄影风格}，{光影特征}光影',
            description: '用于训练细节描写和人物摄影风格'
          }
        ]
      });
    }

    // Default Assignment
    const assignmentsCount = await prisma.assignment.count({ where: { teacherId: admin.id } });
    if (assignmentsCount === 0) {
      await prisma.assignment.create({
        data: {
          teacherId: admin.id,
          title: '第一次挑战：设计你的专属头像',
          description: '请使用文生图功能，为自己设计一个独特的卡通头像。要求必须是正面、背景干净。',
          requirements: JSON.stringify({ theme: '卡通头像', keywords: ['正面', '卡通', '干净背景'] }),
        }
      });
    }
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
