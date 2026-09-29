import { randomBytes } from "node:crypto";
import { cache } from "react";
import type { Prisma } from "./generated/prisma/client";
import { prisma } from "./prisma";
import type { ListQuery } from "./validation";

/** 128 random bits, URL-safe: unique and not guessable. */
export const newPublicToken = () => randomBytes(16).toString("base64url");

/** Everything a public profile may show: never the internal id or timestamps. */
export const publicMemberSelect = {
  publicToken: true,
  memberName: true,
  companyName: true,
  businessCategory: true,
  phone: true,
  address: true,
  birthday: true,
  anniversary: true,
  website: true,
  instagram: true,
  email: true,
  facebook: true,
  youtube: true,
} satisfies Prisma.MemberSelect;

// cache() lets generateMetadata and the page share one query per request.
export const getPublicMember = cache((publicToken: string) =>
  prisma.member.findUnique({ where: { publicToken }, select: publicMemberSelect }),
);

const ORDER_BY = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  name_asc: { memberName: "asc" },
  name_desc: { memberName: "desc" },
} satisfies Record<ListQuery["sort"], Prisma.MemberOrderByWithRelationInput>;

/** Case-insensitive match on name, company, category, email or phone; shared by the list and bulk WhatsApp sends. */
export function memberSearchWhere(search: string): Prisma.MemberWhereInput {
  const contains = { contains: search, mode: "insensitive" } as const;
  return search
    ? {
        OR: [
          { memberName: contains },
          { companyName: contains },
          { businessCategory: contains },
          { email: contains },
          { phone: contains },
        ],
      }
    : {};
}

export async function listMembers({ page, limit, search, sort }: ListQuery) {
  const where = memberSearchWhere(search);
  const [total, members] = await Promise.all([
    prisma.member.count({ where }),
    prisma.member.findMany({
      where,
      orderBy: [ORDER_BY[sort], { id: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return { members, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

/** Counts are bucketed by APP_TIMEZONE so "today" means the admin's day, not the server's. */
export async function getMemberStats() {
  const tz = process.env.APP_TIMEZONE || "UTC";
  const [stats] = await prisma.$queryRaw<{ total: number; today: number; month: number }[]>`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${tz} >= date_trunc('day', now() AT TIME ZONE ${tz}))::int AS today,
      count(*) FILTER (WHERE "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${tz} >= date_trunc('month', now() AT TIME ZONE ${tz}))::int AS month
    FROM "Member"`;
  return stats;
}

/** Turns Prisma's "record not found" (P2025) into null so routes can answer 404; rethrows anything else. */
export function nullIfMissing(error: unknown): null {
  if ((error as { code?: string } | null)?.code === "P2025") return null;
  throw error;
}
