import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// Configure SQLite for high-throughput, non-blocking concurrent writes & reads
prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;')
  .then(() => prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;'))
  .catch(() => {
    // Non-fatal if using PostgreSQL or another engine
  });
