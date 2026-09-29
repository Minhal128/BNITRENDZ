import { encode } from "next-auth/jwt";
import { NextRequest, type NextFetchEvent } from "next/server";
import { describe, expect, it } from "vitest";
import { GET as getPhoto } from "@/app/api/members/public/[publicToken]/photo/route";
import { GET as publicProfile } from "@/app/api/members/public/[publicToken]/route";
import { DELETE, GET as getMember, PATCH } from "@/app/api/members/[id]/route";
import { GET as listMembers, POST } from "@/app/api/members/route";
import { authorizeAdmin } from "@/lib/auth";
import { getMemberStats } from "@/lib/members";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/security";
import proxy from "@/proxy";
import { ADMIN, createAdmin, JPEG, jpegDataUrl, params, request, signInAdmin, validMember } from "./helpers";

const runProxy = (req: NextRequest) =>
  (proxy as unknown as (req: NextRequest, event: NextFetchEvent) => Promise<Response | undefined>)(req, {} as NextFetchEvent);
const list = async (query = "") => (await listMembers(request(`/api/members${query}`))).json();

describe("admin login", () => {
  const headers = new Headers({ "x-forwarded-for": "198.51.100.1" });

  it("signs in with the right password and rejects wrong passwords or unknown emails", async () => {
    await createAdmin();
    expect(await authorizeAdmin({ email: "  ADMIN@test.local ", password: ADMIN.password }, headers)).toMatchObject({
      email: ADMIN.email,
    });
    expect(await authorizeAdmin({ email: ADMIN.email, password: "wrong password" }, headers)).toBeNull();
    expect(await authorizeAdmin({ email: "nobody@test.local", password: ADMIN.password }, headers)).toBeNull();
    expect(await authorizeAdmin({ email: ADMIN.email, password: "" }, headers)).toBeNull();
  });

  it("stores a salted hash, never the plaintext password", async () => {
    const admin = await createAdmin();
    expect(admin.passwordHash).not.toContain(ADMIN.password);
    expect(admin.passwordHash).not.toBe(await hashPassword(ADMIN.password));
  });

  it("locks an IP out after 10 attempts", async () => {
    await createAdmin();
    for (let i = 0; i < 10; i++) expect(await authorizeAdmin({ email: ADMIN.email, password: "guess" }, headers)).toBeNull();
    await expect(authorizeAdmin({ email: ADMIN.email, password: ADMIN.password }, headers)).rejects.toThrow(
      /too many login attempts/i,
    );
  });
});

describe("admin page protection (proxy)", () => {
  it("redirects unauthenticated /admin requests to the login page", async () => {
    const res = await runProxy(new NextRequest("http://localhost:3000/admin/members?page=2"));
    expect(res?.status).toBe(307);
    expect(res?.headers.get("location")).toBe(
      "http://localhost:3000/admin/login?callbackUrl=%2Fadmin%2Fmembers%3Fpage%3D2",
    );
  });

  it("rejects a forged session cookie", async () => {
    const res = await runProxy(
      new NextRequest("http://localhost:3000/admin", { headers: { cookie: "next-auth.session-token=forged" } }),
    );
    expect(res?.status).toBe(307);
  });

  it("lets a valid session through and never blocks the login page itself", async () => {
    const token = await encode({ token: { email: ADMIN.email }, secret: process.env.NEXTAUTH_SECRET! });
    const signedIn = await runProxy(
      new NextRequest("http://localhost:3000/admin", { headers: { cookie: `next-auth.session-token=${token}` } }),
    );
    expect(signedIn?.headers.get("location") ?? null).toBeNull();
    const login = await runProxy(new NextRequest("http://localhost:3000/admin/login"));
    expect(login?.headers.get("location") ?? null).toBeNull();
  });
});

describe("admin member CRUD", () => {
  it("creates a member from the CRM, returning its id and skipping the public rate limit", async () => {
    await signInAdmin();
    for (let i = 0; i < 35; i++) {
      const res = await POST(request("/api/members", { method: "POST", body: { ...validMember, memberName: `Member ${i}` } }));
      expect(res.status).toBe(201);
      expect((await res.json()).member.id).toEqual(expect.any(String));
    }
    expect(await prisma.member.count()).toBe(35);
  });

  it("reads a member by id", async () => {
    await signInAdmin();
    const member = await prisma.member.create({ data: { memberName: "Read Me", publicToken: "read-token" } });
    const res = await getMember(request(`/api/members/${member.id}`), params({ id: member.id }));
    expect(res.status).toBe(200);
    expect((await res.json()).member).toMatchObject({ id: member.id, memberName: "Read Me", publicToken: "read-token" });
    expect((await getMember(request("/api/members/missing"), params({ id: "missing" }))).status).toBe(404);
  });

  it("updates every field but keeps the public token, so the existing QR keeps working", async () => {
    await signInAdmin();
    const member = await prisma.member.create({
      data: { memberName: "Old Name", email: "old@example.com", website: "https://old.example.com/", publicToken: "stable-token" },
    });
    const res = await PATCH(
      request(`/api/members/${member.id}`, {
        method: "PATCH",
        body: { ...validMember, memberName: "New Name", website: "", publicToken: "hijacked", id: "other" },
      }),
      params({ id: member.id }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).member).toMatchObject({
      id: member.id,
      memberName: "New Name",
      companyName: "Acme Ltd",
      email: "jane@example.com",
      website: null,
      publicToken: "stable-token",
    });
    expect((await publicProfile(request("/api/members/public/stable-token"), params({ publicToken: "stable-token" }))).status).toBe(200);
  });

  it("keeps the photo unless an update replaces or removes it", async () => {
    await signInAdmin();
    const member = await prisma.member.create({
      data: { memberName: "Pic", publicToken: "pic-token", photo: JPEG, photoUpdatedAt: new Date(1000) },
    });
    const patch = async (body: object) =>
      (await PATCH(request(`/api/members/${member.id}`, { method: "PATCH", body }), params({ id: member.id }))).json();
    const stored = async () => {
      const row = await prisma.member.findUniqueOrThrow({ where: { id: member.id }, select: { photo: true, photoUpdatedAt: true } });
      return { photo: row.photo && Buffer.from(row.photo), photoUpdatedAt: row.photoUpdatedAt };
    };

    expect((await patch({ memberName: "Pic 2" })).member).not.toHaveProperty("photo"); // bytes never travel inside member JSON
    expect(await stored()).toEqual({ photo: JPEG, photoUpdatedAt: new Date(1000) });

    const other = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43]);
    await patch({ photo: jpegDataUrl(other) });
    const replaced = await stored();
    expect(replaced.photo).toEqual(other);
    expect(replaced.photoUpdatedAt!.getTime()).toBeGreaterThan(1000); // new version, new URL

    await patch({ photo: "" });
    expect(await stored()).toEqual({ photo: null, photoUpdatedAt: null });
    expect((await getPhoto(request("/api/members/public/pic-token/photo"), params({ publicToken: "pic-token" }))).status).toBe(404);
  });

  it("rejects invalid updates and unknown members", async () => {
    await signInAdmin();
    const member = await prisma.member.create({ data: { memberName: "Valid", publicToken: "t-valid" } });
    const bad = await PATCH(
      request(`/api/members/${member.id}`, { method: "PATCH", body: { email: "nope", memberName: "" } }),
      params({ id: member.id }),
    );
    expect(bad.status).toBe(400);
    expect(Object.keys((await bad.json()).fieldErrors).sort()).toEqual(["email", "memberName"]);
    const missing = await PATCH(request("/api/members/missing", { method: "PATCH", body: { memberName: "X" } }), params({ id: "missing" }));
    expect(missing.status).toBe(404);
  });

  it("deletes a member, after which the public profile and its QR resolve to not found", async () => {
    await signInAdmin();
    const member = await prisma.member.create({ data: { memberName: "Delete Me", publicToken: "delete-token" } });
    const res = await DELETE(request(`/api/members/${member.id}`, { method: "DELETE" }), params({ id: member.id }));
    expect(res.status).toBe(204);
    expect(await prisma.member.count()).toBe(0);
    expect((await publicProfile(request("/api/members/public/delete-token"), params({ publicToken: "delete-token" }))).status).toBe(404);
    expect((await DELETE(request(`/api/members/${member.id}`, { method: "DELETE" }), params({ id: member.id }))).status).toBe(404);
  });
});

describe("admin search and pagination", () => {
  it("searches name, company, category, email and phone in the database, case-insensitively", async () => {
    await signInAdmin();
    await prisma.member.createMany({
      data: [
        { memberName: "Alice Smith", companyName: "Zenith Corp", publicToken: "s1" },
        { memberName: "Bob Jones", companyName: "Acme Widgets", publicToken: "s2" },
        { memberName: "Carol White", email: "carol@ACME.io", publicToken: "s3" },
        { memberName: "Dan Brown", phone: "+92 300 5550000", publicToken: "s4" },
        { memberName: "Eve Stone", businessCategory: "Interior Design", publicToken: "s5" },
      ],
    });
    const names = async (search: string) =>
      (await list(`?search=${encodeURIComponent(search)}`)).members.map((m: { memberName: string }) => m.memberName).sort();
    expect(await names("acme")).toEqual(["Bob Jones", "Carol White"]);
    expect(await names("ALICE")).toEqual(["Alice Smith"]);
    expect(await names("5550000")).toEqual(["Dan Brown"]);
    expect(await names("interior")).toEqual(["Eve Stone"]);
    expect(await names("no match")).toEqual([]);
    expect((await list("?search=acme")).total).toBe(2);
  });

  it("paginates on the server with page, limit and sort", async () => {
    await signInAdmin();
    await prisma.member.createMany({
      data: Array.from({ length: 25 }, (_, i) => ({ memberName: `Member ${String(i + 1).padStart(2, "0")}`, publicToken: `p${i}` })),
    });
    const first = await list();
    expect(first).toMatchObject({ total: 25, page: 1, limit: 20, totalPages: 2 });
    expect(first.members).toHaveLength(20);

    const second = await list("?page=2&limit=10&sort=name_asc");
    expect(second).toMatchObject({ total: 25, page: 2, limit: 10, totalPages: 3 });
    expect(second.members.map((m: { memberName: string }) => m.memberName)).toEqual(
      Array.from({ length: 10 }, (_, i) => `Member ${i + 11}`),
    );
    expect((await list("?limit=5&sort=name_desc")).members[0].memberName).toBe("Member 25");
    expect(await list("?page=-4&limit=9999&sort=drop")).toMatchObject({ page: 1, limit: 20 });
  });

  it("counts dashboard stats from real rows", async () => {
    await prisma.member.createMany({
      data: [
        { memberName: "Joined now", publicToken: "d1" },
        { memberName: "Joined long ago", publicToken: "d2", createdAt: new Date("2020-01-15T12:00:00Z") },
      ],
    });
    expect(await getMemberStats()).toEqual({ total: 2, today: 1, month: 1 });
  });
});
