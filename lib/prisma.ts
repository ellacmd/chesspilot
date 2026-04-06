import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/app/generated/prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaClientCtor: typeof PrismaClient | undefined
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  return new PrismaClient({ adapter: new PrismaPg(url) })
}

function getPrismaClient(): PrismaClient {
  if (
    globalForPrisma.prisma &&
    globalForPrisma.prismaClientCtor === PrismaClient
  ) {
    return globalForPrisma.prisma
  }

  if (globalForPrisma.prisma) {
    void globalForPrisma.prisma.$disconnect().catch(() => undefined)
  }

  const prisma = createPrismaClient()

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
    globalForPrisma.prismaClientCtor = PrismaClient
  }

  return prisma
}

export const prisma = getPrismaClient()
