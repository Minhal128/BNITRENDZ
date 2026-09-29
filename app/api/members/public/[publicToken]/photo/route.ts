import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, ctx: RouteContext<"/api/members/public/[publicToken]/photo">) {
  const member = await prisma.member.findUnique({
    where: { publicToken: (await ctx.params).publicToken },
    select: { photo: true },
  });
  if (!member?.photo) return new Response(null, { status: 404 });
  // Page URLs carry ?v=, so a changed photo is a new URL. "private" keeps shared caches from serving a removed photo.
  return new Response(member.photo, {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=31536000, immutable" },
  });
}
