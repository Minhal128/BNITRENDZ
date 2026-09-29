import { getServerSession } from "next-auth";
import { afterAll, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";

// Sessions are controlled per test through signInAs() in helpers.ts.
vi.mock("next-auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next-auth")>()),
  getServerSession: vi.fn(),
}));

beforeEach(async () => {
  vi.mocked(getServerSession).mockResolvedValue(null);
  await prisma.$executeRaw`TRUNCATE "Member", "Admin", "RateLimit"`;
});

afterAll(() => prisma.$disconnect());
