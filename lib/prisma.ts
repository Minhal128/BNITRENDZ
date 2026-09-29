import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

// pg already treats sslmode=require as verify-full but logs a warning each cold start; name the mode explicitly.
const connectionString = process.env.DATABASE_URL?.replace(/sslmode=require\b/, "sslmode=verify-full");

const createClient = () =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    // Photo bytes only leave the database through the photo route, which selects them explicitly.
    omit: { member: { photo: true } },
  });

// Reuse one client across dev hot reloads instead of opening a new pool each time.
const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
