import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/members/export/route";
import { POST } from "@/app/api/members/route";
import { request, signInAdmin, validMember } from "./helpers";

// Response.text() strips the UTF-8 BOM, so the raw bytes are checked separately below.
const csv = async (query = "") => (await GET(request(`/api/members/export${query}`))).text();

async function seed() {
  await signInAdmin();
  await POST(request("/api/members", { method: "POST", body: validMember }));
  await POST(
    request("/api/members", {
      method: "POST",
      body: { ...validMember, memberName: "Ali, Khan", companyName: '=HYPERLINK("evil")', email: "", birthday: "" },
    }),
  );
}

describe("member export", () => {
  it("rejects signed-out requests", async () => {
    expect((await GET(request("/api/members/export"))).status).toBe(401);
  });

  it("exports contacts, sorted by name, with blanks for missing values", async () => {
    await seed();
    expect(await csv()).toBe(
      "Name of member,Company name,Category,Phone no.,Email id\r\n" +
        '"Ali, Khan","\'=HYPERLINK(""evil"")",Interior Design,+92 300 1234567,\r\n' +
        "Jane Doe,Acme Ltd,Interior Design,+92 300 1234567,jane@example.com\r\n",
    );
  });

  it("exports the special dates sheet", async () => {
    await seed();
    expect(await csv("?sheet=dates")).toBe(
      "Name of member,Bday,Anniversary\r\n" +
        '"Ali, Khan",,2015-06-20\r\n' +
        "Jane Doe,1990-05-10,2015-06-20\r\n",
    );
  });

  it("honours the list search and downloads as a .csv", async () => {
    await seed();
    const res = await GET(request("/api/members/export?search=acme"));
    expect(res.headers.get("content-disposition")).toMatch(/^attachment; filename="bnitrendz-contacts-\d{4}-\d\d-\d\d\.csv"$/);
    // Excel needs the BOM to read the file as UTF-8.
    expect(Buffer.from(await res.clone().arrayBuffer()).subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));
    expect((await res.text()).split("\r\n").filter(Boolean)).toHaveLength(2); // header + Jane Doe only
  });
});
