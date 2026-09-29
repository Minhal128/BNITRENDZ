import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/security";

export const ORIGIN = "http://localhost:3000";

export function request(path: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) {
  return new NextRequest(`${ORIGIN}${path}`, {
    method: init.method ?? "GET",
    headers: { "content-type": "application/json", host: "localhost:3000", ...init.headers },
    body: init.body === undefined ? undefined : typeof init.body === "string" ? init.body : JSON.stringify(init.body),
  });
}

export const params = <T extends Record<string, string>>(value: T) => ({ params: Promise.resolve(value) });

export const ADMIN = { email: "admin@test.local", password: "correct horse battery staple" };

export async function createAdmin(email = ADMIN.email, password = ADMIN.password) {
  return prisma.admin.create({ data: { name: "Test Admin", email, passwordHash: await hashPassword(password) } });
}

/** Simulates the NextAuth session cookie for the given email (null = signed out). */
export function signInAs(email: string | null) {
  vi.mocked(getServerSession).mockResolvedValue(
    email ? { user: { email }, expires: new Date(Date.now() + 3_600_000).toISOString() } : null,
  );
}

export async function signInAdmin() {
  const admin = await createAdmin();
  signInAs(admin.email);
  return admin;
}

/** Starts like a JPEG (FF D8 FF), which is all the server checks; the browser re-encodes real photos. */
export const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0xff, 0xd9]);
export const jpegDataUrl = (bytes: Buffer = JPEG) => `data:image/jpeg;base64,${bytes.toString("base64")}`;

export const validMember = {
  memberName: "Jane Doe",
  companyName: "Acme Ltd",
  businessCategory: "Interior Design",
  phone: "+92 300 1234567",
  address: "1 Main Street, Karachi",
  birthday: "1990-05-10",
  anniversary: "2015-06-20",
  website: "acme.example.com",
  instagram: "@jane.doe",
  email: "jane@example.com",
  facebook: "jane.doe",
  youtube: "https://www.youtube.com/@janedoe",
};
