import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export const connectDB = async (): Promise<void> => {
  try {
    // Prisma connect lazy khi query đầu tiên chạy; gọi $connect() để fail sớm lúc khởi động.
    await prisma.$connect();
    console.log('✅ PostgreSQL connected via Prisma');
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`❌ PostgreSQL connection error: ${detail}`);
    process.exit(1);
  }
};
