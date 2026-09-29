import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

// Reuse one client across dev hot reloads instead of opening a new pool each time.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// pg already treats sslmode=require as verify-full but logs a warning each cold start; name the mode explicitly.
const connectionString = process.env.DATABASE_URL?.replace(/sslmode=require\b/, "sslmode=verify-full");

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
