import { z } from "zod";
import { denyUnlessAdmin } from "@/lib/auth";
import { memberSearchWhere } from "@/lib/members";
import { prisma } from "@/lib/prisma";
import { invalidResponse } from "@/lib/validation";
import { isWhatsAppConfigured, sendWhatsApp, toWhatsAppNumber } from "@/lib/whatsapp";

export const maxDuration = 60;

const MAX_RECIPIENTS = 1000;
const PARALLEL_SENDS = 8; // well under WhatsApp's 80 messages/second per number

const sendSchema = z
  .object({
    memberIds: z.array(z.string().max(64)).max(MAX_RECIPIENTS).default([]),
    all: z.boolean().default(false), // every member matching `search`, across all pages
    search: z.string().trim().max(100).default(""),
    message: z.discriminatedUnion("type", [
      z.object({ type: z.literal("text"), text: z.string().trim().min(1, "Write a message first.").max(4096) }),
      z.object({
        type: z.literal("template"),
        name: z.string().regex(/^[a-z0-9_]{1,512}$/, "Choose a template."),
        language: z.string().regex(/^[A-Za-z_]{2,15}$/),
        parameters: z
          .array(
            z.object({
              name: z.string().max(100).optional(),
              value: z.string().trim().min(1, "Fill in every template variable.").max(1000),
            }),
          )
          .max(20),
      }),
    ]),
  })
  .refine((d) => d.all || d.memberIds.length > 0, { message: "Select at least one member.", path: ["memberIds"] });

type Result = { id: string; memberName: string; status: "sent" | "failed" | "skipped"; error?: string };

export async function POST(req: Request) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;
  if (!isWhatsAppConfigured()) {
    return Response.json({ error: "WhatsApp is not configured on the server." }, { status: 503 });
  }
  const parsed = sendSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return invalidResponse(parsed.error);
  const { memberIds, all, search, message } = parsed.data;

  const members = await prisma.member.findMany({
    where: all ? memberSearchWhere(search) : { id: { in: memberIds } },
    select: { id: true, memberName: true, phone: true },
    orderBy: { memberName: "asc" },
    take: MAX_RECIPIENTS,
  });

  const send = async ({ id, memberName, phone }: (typeof members)[number]): Promise<Result> => {
    const to = phone ? toWhatsAppNumber(phone) : null;
    if (!to) return { id, memberName, status: "skipped", error: phone ? "Invalid phone number" : "No phone number" };
    try {
      await sendWhatsApp(to, message, memberName);
      return { id, memberName, status: "sent" };
    } catch (error) {
      return { id, memberName, status: "failed", error: (error as Error).message };
    }
  };

  // ponytail: small parallel batches inside one request; move to a queue if sends ever exceed a few thousand.
  const results: Result[] = [];
  for (let i = 0; i < members.length; i += PARALLEL_SENDS) {
    results.push(...(await Promise.all(members.slice(i, i + PARALLEL_SENDS).map(send))));
  }
  const count = (status: Result["status"]) => results.filter((r) => r.status === status).length;
  return Response.json({ sent: count("sent"), failed: count("failed"), skipped: count("skipped"), results });
}
