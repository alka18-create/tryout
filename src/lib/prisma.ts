import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

// In development, ensure new models like learningMaterial are available even if the server started earlier
if (
  !globalForPrisma.prisma ||
  (env.NODE_ENV === "development" &&
    !("learningMaterial" in (globalForPrisma.prisma as object)))
) {
  globalForPrisma.prisma = createPrismaClient();
}

export const prisma = globalForPrisma.prisma;

export * from "@/generated/prisma/client";
