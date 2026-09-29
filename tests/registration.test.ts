import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/members/public/[publicToken]/photo/route";
import { POST } from "@/app/api/members/route";
import { prisma } from "@/lib/prisma";
import { JPEG, jpegDataUrl, params, request, validMember } from "./helpers";

const register = (body: unknown, headers?: Record<string, string>) =>
  POST(request("/api/members", { method: "POST", body, headers }));

describe("public registration (POST /api/members)", () => {
  it("accepts a valid submission and returns only public profile fields", async () => {
    const res = await register(validMember);
    expect(res.status).toBe(201);
    const { member } = await res.json();
    expect(member).toMatchObject({
      memberName: "Jane Doe",
      website: "https://acme.example.com/",
      instagram: "jane.doe",
    });
    expect(member).not.toHaveProperty("id");
    expect(member).not.toHaveProperty("createdAt");
    expect(member).not.toHaveProperty("birthday"); // special dates are admin-only
    expect(member).not.toHaveProperty("anniversary");
  });

  it("stores a photo from the camera or an upload and serves it at the public photo URL", async () => {
    const { member } = await (await register({ ...validMember, photo: jpegDataUrl() })).json();
    expect(member).not.toHaveProperty("photo"); // bytes never travel inside member JSON
    const res = await GET(request(`/api/members/public/${member.publicToken}/photo`), params({ publicToken: member.publicToken }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(Buffer.from(await res.arrayBuffer())).toEqual(JPEG);
  });

  it("rejects photos that aren't JPEG data URLs or are too large", async () => {
    const tooBig = `data:image/jpeg;base64,/9j/${"A".repeat(700_000)}`;
    for (const photo of ["data:image/png;base64,iVBORw0KGgo=", "data:text/html;base64,PHNjcmlwdD4=", "javascript:alert(1)", tooBig]) {
      const res = await register({ memberName: "Jane Doe", photo });
      expect(res.status).toBe(400);
      expect((await res.json()).fieldErrors.photo).toBeDefined();
    }
    expect(await prisma.member.count()).toBe(0);
  });

  it("saves every member field to the database", async () => {
    const { member } = await (await register(validMember)).json();
    const row = await prisma.member.findUniqueOrThrow({ where: { publicToken: member.publicToken } });
    expect(row).toMatchObject({
      memberName: "Jane Doe",
      companyName: "Acme Ltd",
      businessCategory: "Interior Design",
      phone: "+92 300 1234567",
      address: "1 Main Street, Karachi",
      website: "https://acme.example.com/",
      instagram: "jane.doe",
      email: "jane@example.com",
      facebook: "jane.doe",
      youtube: "https://www.youtube.com/@janedoe",
    });
    expect(row.birthday?.toISOString().slice(0, 10)).toBe("1990-05-10");
    expect(row.anniversary?.toISOString().slice(0, 10)).toBe("2015-06-20");
  });

  it("generates a unique, URL-safe, non-guessable public token for every member", async () => {
    const tokens: string[] = [];
    for (let i = 0; i < 5; i++) tokens.push((await (await register({ memberName: `Member ${i}` })).json()).member.publicToken);
    for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/); // 128 random bits
    expect(new Set(tokens).size).toBe(tokens.length);
  });

  it("needs only a member name, trims whitespace and stores blank fields as null", async () => {
    const { member } = await (await register({ memberName: "   Jane   Doe  ", email: "   ", website: "" })).json();
    const row = await prisma.member.findUniqueOrThrow({ where: { publicToken: member.publicToken } });
    expect(row).toMatchObject({ memberName: "Jane Doe", email: null, website: null, phone: null, birthday: null });
  });

  it("rejects a missing member name", async () => {
    const res = await register({ ...validMember, memberName: "   " });
    expect(res.status).toBe(400);
    expect((await res.json()).fieldErrors.memberName).toEqual(["Member name is required."]);
    expect(await prisma.member.count()).toBe(0);
  });

  it("rejects an invalid email", async () => {
    const res = await register({ ...validMember, email: "jane@" });
    expect(res.status).toBe(400);
    expect((await res.json()).fieldErrors.email).toEqual(["Enter a valid email address."]);
  });

  it("rejects an invalid URL", async () => {
    const res = await register({ ...validMember, website: "not a website" });
    expect(res.status).toBe(400);
    expect((await res.json()).fieldErrors.website).toBeDefined();
  });

  it("rejects impossible and future dates", async () => {
    const res = await register({ ...validMember, birthday: "2023-02-30", anniversary: "2999-01-01" });
    expect(res.status).toBe(400);
    const { fieldErrors } = await res.json();
    expect(fieldErrors.birthday).toBeDefined();
    expect(fieldErrors.anniversary).toBeDefined();
  });

  it("rejects text over the maximum length and malformed bodies", async () => {
    expect((await register({ memberName: "x".repeat(101) })).status).toBe(400);
    expect((await register("{not json")).status).toBe(400);
    expect((await register(null)).status).toBe(400);
    expect(await prisma.member.count()).toBe(0);
  });

  it("rate limits bursts of registrations from one IP address", async () => {
    const ip = { "x-forwarded-for": "203.0.113.9" };
    for (let i = 0; i < 30; i++) expect((await register({ memberName: `Member ${i}` }, ip)).status).toBe(201);
    const blocked = await register({ memberName: "One too many" }, ip);
    expect(blocked.status).toBe(429);
    expect((await blocked.json()).error).toMatch(/too many registrations/i);
    expect((await register({ memberName: "Different network" }, { "x-forwarded-for": "203.0.113.10" })).status).toBe(201);
  });
});
