import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GET as getPhoto } from "@/app/api/members/public/[publicToken]/photo/route";
import { GET } from "@/app/api/members/public/[publicToken]/route";
import ProfilePage from "@/app/member/[publicToken]/page";
import { prisma } from "@/lib/prisma";
import { JPEG, params, request } from "./helpers";

const fetchProfile = (publicToken: string) => GET(request(`/api/members/public/${publicToken}`), params({ publicToken }));
const renderProfile = async (publicToken: string) =>
  renderToStaticMarkup(await ProfilePage({ ...params({ publicToken }), searchParams: Promise.resolve({}) }));

describe("public member profile", () => {
  it("returns the profile for a valid token without internal fields", async () => {
    await prisma.member.create({ data: { memberName: "Jane Doe", phone: "+92 300 1234567", publicToken: "valid-token-1" } });
    const res = await fetchProfile("valid-token-1");
    expect(res.status).toBe(200);
    const { member } = await res.json();
    expect(member).toMatchObject({ memberName: "Jane Doe", phone: "+92 300 1234567", publicToken: "valid-token-1" });
    expect(member).not.toHaveProperty("id");
    expect(member).not.toHaveProperty("updatedAt");
  });

  it("renders only the fields that have values, with clickable contact links", async () => {
    await prisma.member.create({
      data: { memberName: "Jane Doe", phone: "+92 300 1234567", instagram: "jane.doe", publicToken: "valid-token-2" },
    });
    const html = await renderProfile("valid-token-2");
    expect(html).toContain("Jane Doe");
    expect(html).toContain('href="tel:+923001234567"');
    expect(html).toContain('href="https://www.instagram.com/jane.doe"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain("Birthday");
    expect(html).not.toContain("Website");
  });

  it("shows the photo but keeps special dates off the public profile and API", async () => {
    await prisma.member.create({
      data: {
        memberName: "Jane Doe",
        birthday: new Date("1990-05-10"),
        anniversary: new Date("2015-06-20"),
        photo: JPEG,
        photoUpdatedAt: new Date(1000),
        publicToken: "dates-token",
      },
    });
    const { member } = await (await fetchProfile("dates-token")).json();
    expect(member).not.toHaveProperty("birthday");
    expect(member).not.toHaveProperty("anniversary");
    const html = await renderProfile("dates-token");
    expect(html).not.toMatch(/Birthday|Anniversary|1990|2015/);
    expect(html).toContain('src="/api/members/public/dates-token/photo?v=1000"');
  });

  it("answers 404 for the photo of a member without one, or of an unknown token", async () => {
    await prisma.member.create({ data: { memberName: "No Photo", publicToken: "no-photo" } });
    for (const publicToken of ["no-photo", "no-such-token"]) {
      expect((await getPhoto(request(`/api/members/public/${publicToken}/photo`), params({ publicToken }))).status).toBe(404);
    }
  });

  it("answers 404 / Member Not Found for an invalid token", async () => {
    const res = await fetchProfile("no-such-token");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Member not found." });
    await expect(renderProfile("no-such-token")).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
  });

  it("stops resolving once the member is deleted", async () => {
    const member = await prisma.member.create({ data: { memberName: "Gone Soon", publicToken: "deleted-token" } });
    expect((await fetchProfile("deleted-token")).status).toBe(200);
    await prisma.member.delete({ where: { id: member.id } });
    expect((await fetchProfile("deleted-token")).status).toBe(404);
    await expect(renderProfile("deleted-token")).rejects.toMatchObject({ digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
  });
});
