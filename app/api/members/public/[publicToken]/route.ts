import { getPublicMember } from "@/lib/members";

export async function GET(_req: Request, ctx: RouteContext<"/api/members/public/[publicToken]">) {
  const member = await getPublicMember((await ctx.params).publicToken);
  return member ? Response.json({ member }) : Response.json({ error: "Member not found." }, { status: 404 });
}
