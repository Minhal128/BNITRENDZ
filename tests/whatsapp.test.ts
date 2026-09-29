import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/whatsapp/send/route";
import { GET as getTemplates } from "@/app/api/whatsapp/templates/route";
import { prisma } from "@/lib/prisma";
import { toWhatsAppNumber } from "@/lib/whatsapp";
import { request, signInAdmin } from "./helpers";

type GraphCall = { url: string; body?: Record<string, unknown>; auth?: string };
const calls: GraphCall[] = [];

/** Configures WhatsApp and replaces the Graph API with `respond`; nothing leaves the machine. */
function stubGraph(respond: (call: GraphCall) => { status?: number; json: unknown } = () => ({ json: { messages: [{ id: "wamid.1" }] } })) {
  vi.stubEnv("WHATSAPP_ACCESS_TOKEN", "test-token");
  vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "PHONE_ID");
  vi.stubEnv("WHATSAPP_BUSINESS_ACCOUNT_ID", "WABA_ID");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const call = {
        url,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
        auth: (init?.headers as Record<string, string>)?.Authorization,
      };
      calls.push(call);
      const { status = 200, json } = respond(call);
      return Response.json(json, { status });
    }),
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  calls.length = 0;
});

const send = (body: unknown, headers?: Record<string, string>) =>
  POST(request("/api/whatsapp/send", { method: "POST", body, headers }));
const template = (value = "{name}") => ({ type: "template", name: "member_update", language: "en_US", parameters: [{ value }] });

describe("WhatsApp phone numbers", () => {
  it("normalises stored numbers to digits-only international format", () => {
    expect(toWhatsAppNumber("+91 98765 43210")).toBe("919876543210");
    expect(toWhatsAppNumber("9876543210")).toBe("919876543210"); // no country code: India
    expect(toWhatsAppNumber("098765 43210")).toBe("919876543210"); // trunk prefix dropped
    expect(toWhatsAppNumber("0092 300 1234567")).toBe("923001234567");
    expect(toWhatsAppNumber("+1 (555) 010-9999")).toBe("15550109999");
    expect(toWhatsAppNumber("12345")).toBeNull();
  });
});

describe("POST /api/whatsapp/send", () => {
  it("sends a template to the selected members, personalised with each name", async () => {
    await signInAdmin();
    stubGraph();
    const [a, b, noPhone] = await Promise.all([
      prisma.member.create({ data: { memberName: "Asha Rao", phone: "+91 98765 43210", publicToken: "w1" } }),
      prisma.member.create({ data: { memberName: "Ravi Kumar", phone: "9123456780", publicToken: "w2" } }),
      prisma.member.create({ data: { memberName: "No Phone", publicToken: "w3" } }),
    ]);
    await prisma.member.create({ data: { memberName: "Not Selected", phone: "+91 90000 00000", publicToken: "w4" } });

    const res = await send({ memberIds: [a.id, b.id, noPhone.id], message: template() });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ sent: 2, failed: 0, skipped: 1 });

    expect(calls).toHaveLength(2);
    for (const call of calls) {
      expect(call.url).toBe("https://graph.facebook.com/v24.0/PHONE_ID/messages");
      expect(call.auth).toBe("Bearer test-token");
    }
    const byNumber = Object.fromEntries(calls.map((c) => [c.body!.to, c.body]));
    expect(byNumber["919876543210"]).toMatchObject({
      messaging_product: "whatsapp",
      type: "template",
      template: {
        name: "member_update",
        language: { code: "en_US" },
        components: [{ type: "body", parameters: [{ type: "text", text: "Asha Rao" }] }],
      },
    });
    expect(byNumber["919123456780"]).toBeDefined();
  });

  it("sends custom text and reports WhatsApp errors per member", async () => {
    await signInAdmin();
    stubGraph(({ body }) =>
      body?.to === "919000000001"
        ? { status: 400, json: { error: { message: "(#131030) Recipient not in allowed list", error_data: { details: "Recipient phone number not in allowed list" } } } }
        : { json: { messages: [{ id: "wamid.ok" }] } },
    );
    const ok = await prisma.member.create({ data: { memberName: "Ok Member", phone: "+91 90000 00002", publicToken: "t1" } });
    const bad = await prisma.member.create({ data: { memberName: "Bad Member", phone: "+91 90000 00001", publicToken: "t2" } });

    const res = await send({ memberIds: [ok.id, bad.id], message: { type: "text", text: "Hi {name},\nsee you Thursday." } });
    const data = await res.json();
    expect(data).toMatchObject({ sent: 1, failed: 1, skipped: 0 });
    expect(data.results.find((r: { id: string }) => r.id === bad.id)).toMatchObject({
      status: "failed",
      error: "Recipient phone number not in allowed list",
    });
    const okCall = calls.find((c) => c.body?.to === "919000000002");
    expect(okCall?.body).toMatchObject({ type: "text", text: { body: "Hi Ok Member,\nsee you Thursday." } });
  });

  it("can message every member matching a search, across pages", async () => {
    await signInAdmin();
    stubGraph();
    await prisma.member.createMany({
      data: [
        { memberName: "Acme One", phone: "+91 90000 00011", publicToken: "s1" },
        { memberName: "Acme Two", phone: "+91 90000 00012", publicToken: "s2" },
        { memberName: "Other", phone: "+91 90000 00013", publicToken: "s3" },
      ],
    });
    const res = await send({ all: true, search: "acme", message: template("Hello") });
    expect(await res.json()).toMatchObject({ sent: 2 });
    expect(calls.map((c) => c.body!.to).sort()).toEqual(["919000000011", "919000000012"]);
  });

  it("is admin-only, CSRF-protected, validated, and needs WhatsApp configured", async () => {
    const member = await prisma.member.create({ data: { memberName: "Guarded", phone: "+91 90000 00020", publicToken: "g1" } });
    stubGraph();
    expect((await send({ memberIds: [member.id], message: template() })).status).toBe(401);

    await signInAdmin();
    expect((await send({ memberIds: [member.id], message: template() }, { origin: "https://evil.example" })).status).toBe(403);
    expect((await send({ memberIds: [], message: template() })).status).toBe(400);
    expect((await send({ memberIds: [member.id], message: template("   ") })).status).toBe(400);
    expect((await send({ memberIds: [member.id], message: { type: "text", text: "" } })).status).toBe(400);
    expect(calls).toHaveLength(0);

    vi.unstubAllEnvs();
    expect((await send({ memberIds: [member.id], message: template() })).status).toBe(503);
  });
});

describe("GET /api/whatsapp/templates", () => {
  it("lists only approved templates that can be sent from the CRM", async () => {
    await signInAdmin();
    const body = (text: string) => ({ type: "BODY", text });
    stubGraph(() => ({
      json: {
        data: [
          { name: "member_update", language: "en_US", status: "APPROVED", category: "UTILITY", parameter_format: "POSITIONAL", components: [{ type: "HEADER", format: "TEXT", text: "BNI Trendz" }, { ...body("Hi {{1}}, meeting on {{2}}."), example: { body_text: [["Asha", "Thursday"]] } }, { type: "FOOTER", text: "Thanks" }] },
          { name: "welcome_named", language: "en", status: "APPROVED", category: "MARKETING", parameter_format: "NAMED", components: [{ ...body("Welcome {{first_name}}!"), example: { body_text_named_params: [{ param_name: "first_name", example: "Ravi" }] } }] },
          { name: "otp_verification", language: "en_US", status: "APPROVED", category: "AUTHENTICATION", components: [body("*{{1}}* is your code.")] },
          { name: "poster", language: "en_US", status: "APPROVED", category: "MARKETING", components: [{ type: "HEADER", format: "IMAGE" }, body("Look!")] },
          { name: "draft", language: "en_US", status: "PENDING", category: "UTILITY", components: [body("Soon")] },
        ],
      },
    }));
    const res = await getTemplates(request("/api/whatsapp/templates"));
    const data = await res.json();
    expect(data.configured).toBe(true);
    expect(data.templates).toEqual([
      { name: "member_update", language: "en_US", category: "UTILITY", header: "BNI Trendz", body: "Hi {{1}}, meeting on {{2}}.", footer: "Thanks", variables: ["1", "2"], examples: ["Asha", "Thursday"], named: false },
      { name: "welcome_named", language: "en", category: "MARKETING", body: "Welcome {{first_name}}!", variables: ["first_name"], examples: ["Ravi"], named: true },
    ]);
    expect(calls[0]!.url).toContain("https://graph.facebook.com/v24.0/WABA_ID/message_templates");
  });

  it("reports when WhatsApp is not configured and rejects non-admins", async () => {
    expect((await getTemplates(request("/api/whatsapp/templates"))).status).toBe(401);
    await signInAdmin();
    expect(await (await getTemplates(request("/api/whatsapp/templates"))).json()).toEqual({ configured: false, templates: [] });
  });
});
