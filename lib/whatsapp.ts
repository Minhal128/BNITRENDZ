// WhatsApp Cloud API (Meta Graph API). Config is read per call so env changes apply without code changes.
const GRAPH_URL = "https://graph.facebook.com/v24.0";

type Config = { token: string; phoneNumberId: string; accountId: string };

function config(): Config | null {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  return token && phoneNumberId && accountId ? { token, phoneNumberId, accountId } : null;
}

export const isWhatsAppConfigured = () => config() !== null;

async function graph<T>(path: string, body?: unknown): Promise<T> {
  const cfg = config();
  if (!cfg) throw new Error("WhatsApp is not configured.");
  const res = await fetch(`${GRAPH_URL}/${path.replace("{account}", cfg.accountId).replace("{phone}", cfg.phoneNumberId)}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.error_data?.details || data?.error?.message || `WhatsApp request failed (${res.status}).`);
  }
  return data as T;
}

/**
 * Numbers are stored as typed, so normalise to WhatsApp's digits-only international format.
 * ponytail: numbers typed without a country code are assumed Indian (+91), like the form's example.
 */
export function toWhatsAppNumber(phone: string): string | null {
  const trimmed = phone.trim();
  let digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("00")) digits = digits.slice(2);
  else if (!trimmed.startsWith("+")) {
    if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
    if (digits.length === 10) digits = `91${digits}`;
  }
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

type RawTemplate = {
  name: string;
  language: string;
  status: string;
  category: string;
  parameter_format?: string;
  components: { type: string; format?: string; text?: string; buttons?: { type: string; url?: string }[] }[];
};

export type WhatsAppTemplate = {
  name: string;
  language: string;
  category: string;
  header?: string;
  body: string;
  footer?: string;
  variables: string[];
  named: boolean;
};

const hasVariable = (text = "") => /\{\{\s*\w+\s*\}\}/.test(text);

/** Approved templates that can be sent from the CRM: variables only in the body, no media headers, no OTP or dynamic buttons. */
export async function listTemplates(): Promise<WhatsAppTemplate[]> {
  const { data } = await graph<{ data: RawTemplate[] }>(
    "{account}/message_templates?fields=name,language,status,category,parameter_format,components&limit=200",
  );
  return data.flatMap((t) => {
    const part = (type: string) => t.components.find((c) => c.type === type);
    const header = part("HEADER");
    const body = part("BODY");
    const buttons = part("BUTTONS")?.buttons ?? [];
    const sendable =
      t.status === "APPROVED" &&
      t.category !== "AUTHENTICATION" &&
      body?.text &&
      (!header || (header.format === "TEXT" && !hasVariable(header.text))) &&
      buttons.every((b) => ["QUICK_REPLY", "PHONE_NUMBER"].includes(b.type) || (b.type === "URL" && !hasVariable(b.url)));
    if (!sendable || !body?.text) return [];
    const variables = [...new Set([...body.text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]!))];
    return [
      {
        name: t.name,
        language: t.language,
        category: t.category,
        header: header?.text,
        body: body.text,
        footer: part("FOOTER")?.text,
        variables,
        named: t.parameter_format === "NAMED",
      },
    ];
  });
}

export type OutgoingMessage =
  | { type: "text"; text: string }
  | { type: "template"; name: string; language: string; parameters: { name?: string; value: string }[] };

/** Sends one message; "{name}" anywhere in the text or template values becomes the member's name. */
export async function sendWhatsApp(to: string, message: OutgoingMessage, memberName: string) {
  const fill = (value: string) => value.replaceAll("{name}", memberName);
  const content =
    message.type === "text"
      ? { type: "text", text: { preview_url: true, body: fill(message.text) } }
      : {
          type: "template",
          template: {
            name: message.name,
            language: { code: message.language },
            ...(message.parameters.length > 0 && {
              components: [
                {
                  type: "body",
                  // WhatsApp rejects newlines, tabs and long space runs inside template parameters.
                  parameters: message.parameters.map((p) => ({
                    type: "text",
                    text: fill(p.value).replace(/\s+/g, " ").trim(),
                    ...(p.name && { parameter_name: p.name }),
                  })),
                },
              ],
            }),
          },
        };
  const data = await graph<{ messages?: { id: string }[] }>("{phone}/messages", {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    ...content,
  });
  return data.messages?.[0]?.id;
}
