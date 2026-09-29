import type { NextRequest } from "next/server";
import { denyUnlessAdmin, getAdmin } from "@/lib/auth";
import { listMembers, newPublicToken, publicMemberSelect } from "@/lib/members";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit } from "@/lib/security";
import { invalidResponse, listQuerySchema, memberSchema } from "@/lib/validation";

// Generous enough for a chapter meeting registering over one Wi-Fi, low enough to stop floods.
const REGISTRATIONS_PER_WINDOW = 30;
const WINDOW_SECONDS = 10 * 60;

export async function GET(req: NextRequest) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;
  return Response.json(await listMembers(listQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams))));
}

/** Public registration. Admins use the same endpoint from the CRM: no rate limit, full record returned. */
export async function POST(req: Request) {
  const admin = await getAdmin();
  if (!admin && !(await rateLimit(`register:${clientIp(req.headers)}`, REGISTRATIONS_PER_WINDOW, WINDOW_SECONDS))) {
    return Response.json(
      { error: "Too many registrations from your network. Please try again in a few minutes." },
      { status: 429 },
    );
  }

  const parsed = memberSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidResponse(parsed.error);

  const data = { ...parsed.data, publicToken: newPublicToken() };
  const member = admin
    ? await prisma.member.create({ data })
    : await prisma.member.create({ data, select: publicMemberSelect });
  return Response.json({ member }, { status: 201 });
}
