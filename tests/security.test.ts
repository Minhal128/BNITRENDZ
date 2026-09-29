import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DELETE, GET as getMember, PATCH } from "@/app/api/members/[id]/route";
import { GET as listMembers, POST } from "@/app/api/members/route";
import ProfilePage from "@/app/member/[publicToken]/page";
import { socialHref, websiteHref } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { toHttpUrl } from "@/lib/validation";
import { params, request, signInAdmin, signInAs } from "./helpers";

const seedMember = () => prisma.member.create({ data: { memberName: "Protected", publicToken: "protected-token" } });

const adminCalls = (id: string) => [
  ["GET /api/members", () => listMembers(request("/api/members"))],
  ["GET /api/members/:id", () => getMember(request(`/api/members/${id}`), params({ id }))],
  ["PATCH /api/members/:id", () => PATCH(request(`/api/members/${id}`, { method: "PATCH", body: { memberName: "Hacked" } }), params({ id }))],
  ["DELETE /api/members/:id", () => DELETE(request(`/api/members/${id}`, { method: "DELETE" }), params({ id }))],
] as const;

describe("unauthenticated API requests", () => {
  it("rejects every admin endpoint with 401 and changes nothing", async () => {
    const member = await seedMember();
    for (const [name, call] of adminCalls(member.id)) {
      const res = await call();
      expect(res.status, name).toBe(401);
      expect(JSON.stringify(await res.json()), name).not.toContain("Protected");
    }
    expect(await prisma.member.findUniqueOrThrow({ where: { id: member.id } })).toMatchObject({ memberName: "Protected" });
  });
});

describe("unauthorized admin requests", () => {
  it("rejects a session that does not belong to an existing admin", async () => {
    const member = await seedMember();
    signInAs("not-an-admin@example.com");
    for (const [name, call] of adminCalls(member.id)) expect((await call()).status, name).toBe(401);
    expect(await prisma.member.count()).toBe(1);
  });

  it("rejects cross-site mutations even with a valid admin session (CSRF)", async () => {
    await signInAdmin();
    const member = await seedMember();
    const crossSite = { origin: "https://evil.example" };
    const patch = await PATCH(
      request(`/api/members/${member.id}`, { method: "PATCH", body: { memberName: "Hacked" }, headers: crossSite }),
      params({ id: member.id }),
    );
    expect(patch.status).toBe(403);
    const del = await DELETE(request(`/api/members/${member.id}`, { method: "DELETE", headers: crossSite }), params({ id: member.id }));
    expect(del.status).toBe(403);
    expect(await prisma.member.findUniqueOrThrow({ where: { id: member.id } })).toMatchObject({ memberName: "Protected" });

    const sameSite = await DELETE(
      request(`/api/members/${member.id}`, { method: "DELETE", headers: { origin: "http://localhost:3000" } }),
      params({ id: member.id }),
    );
    expect(sameSite.status).toBe(204);
  });
});

describe("dangerous URL input", () => {
  const dangerous = [
    "javascript:alert(1)",
    "JaVaScRiPt:alert(document.cookie)",
    " javascript:alert(1)",
    "java\tscript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "ftp://example.com/file",
  ];

  it.each(dangerous)("rejects %j in every link field", async (url) => {
    for (const field of ["website", "instagram", "facebook", "youtube"]) {
      const res = await POST(request("/api/members", { method: "POST", body: { memberName: "Link Test", [field]: url } }));
      expect(res.status, field).toBe(400);
      expect((await res.json()).fieldErrors[field], field).toBeDefined();
    }
    expect(await prisma.member.count()).toBe(0);
  });

  it("only ever normalises to http(s) links", () => {
    for (const url of dangerous) expect(toHttpUrl(url.trim())).toBeNull();
    expect(toHttpUrl("example.com")).toBe("https://example.com/");
    expect(toHttpUrl("http://example.com/a?b=1")).toBe("http://example.com/a?b=1");
    // Render helpers stay harmless even for values that bypassed validation.
    expect(websiteHref("javascript:alert(1)")).toBe("https://javascript:alert(1)");
    expect(socialHref("instagram", "javascript:alert(1)")).toBe("https://www.instagram.com/javascript%3Aalert(1)");
  });
});

describe("XSS-style input", () => {
  it("stores markup as plain text and renders it escaped", async () => {
    const payload = `<script>alert("xss")</script><img src=x onerror=alert(1)>`;
    const res = await POST(
      request("/api/members", { method: "POST", body: { memberName: payload, companyName: payload, address: payload } }),
    );
    expect(res.status).toBe(201);
    const { member } = await res.json();
    expect(member.memberName).toBe(payload);

    const html = renderToStaticMarkup(
      await ProfilePage({ params: Promise.resolve({ publicToken: member.publicToken }), searchParams: Promise.resolve({}) }),
    );
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;");
  });
});
