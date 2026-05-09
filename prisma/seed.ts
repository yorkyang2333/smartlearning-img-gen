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
      sizes: ['1024x1024', '1536x1024', '1024x1536'],
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
      sizes: ['1024x1024', '1536x1024', '1024x1536'],
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
      sizes: ['1024x1024', '1536x1024', '1024x1536'],
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
      sizes: ['1024x1024', '1536x1024', '1024x1536'],
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
