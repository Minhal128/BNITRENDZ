import { denyUnlessAdmin } from "@/lib/auth";
import { nullIfMissing } from "@/lib/members";
import { prisma } from "@/lib/prisma";
import { invalidResponse, memberUpdateSchema } from "@/lib/validation";

const notFound = () => Response.json({ error: "Member not found." }, { status: 404 });

export async function GET(req: Request, ctx: RouteContext<"/api/members/[id]">) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;
  const member = await prisma.member.findUnique({ where: { id: (await ctx.params).id } });
  return member ? Response.json({ member }) : notFound();
}

// publicToken is not part of the schema, so edits can never change a member's link or QR code.
export async function PATCH(req: Request, ctx: RouteContext<"/api/members/[id]">) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;
  const parsed = memberUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidResponse(parsed.error);
  const member = await prisma.member
    .update({ where: { id: (await ctx.params).id }, data: parsed.data })
    .catch(nullIfMissing);
  return member ? Response.json({ member }) : notFound();
}

export async function DELETE(req: Request, ctx: RouteContext<"/api/members/[id]">) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;
  const member = await prisma.member
    .delete({ where: { id: (await ctx.params).id }, select: { id: true } })
    .catch(nullIfMissing);
  return member ? new Response(null, { status: 204 }) : notFound();
}
