import { denyUnlessAdmin } from "@/lib/auth";
import { isWhatsAppConfigured, listTemplates } from "@/lib/whatsapp";

export async function GET(req: Request) {
  const denied = await denyUnlessAdmin(req);
  if (denied) return denied;
  if (!isWhatsAppConfigured()) return Response.json({ configured: false, templates: [] });
  try {
    return Response.json({ configured: true, templates: await listTemplates() });
  } catch (error) {
    return Response.json({ error: `Couldn't load WhatsApp templates: ${(error as Error).message}` }, { status: 502 });
  }
}
