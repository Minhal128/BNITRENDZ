import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import { clientIp, hashPassword, isSameOrigin, rateLimit, verifyPassword } from "./security";

let dummyHash: Promise<string> | undefined;

export async function authorizeAdmin(credentials: { email?: string; password?: string } | undefined, headers: Headers) {
  const email = credentials?.email?.trim().toLowerCase() ?? "";
  const password = credentials?.password ?? "";
  if (!email || !password || password.length > 200) return null;

  if (!(await rateLimit(`login:${clientIp(headers)}`, 10, 15 * 60))) {
    throw new Error("Too many login attempts. Please wait 15 minutes and try again.");
  }

  const admin = await prisma.admin.findUnique({ where: { email } });
  // Hash even for unknown emails so response timing doesn't reveal which admin accounts exist.
  const valid = await verifyPassword(password, admin?.passwordHash ?? (await (dummyHash ??= hashPassword("x"))));
  return admin && valid ? { id: admin.id, name: admin.name, email: admin.email } : null;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/admin/login" },
  providers: [
    CredentialsProvider({
      credentials: { email: { type: "email" }, password: { type: "password" } },
      authorize: (credentials, req) => authorizeAdmin(credentials, new Headers(req.headers as Record<string, string>)),
    }),
  ],
};

/** The signed-in admin, re-checked against the database so deleted admins lose access immediately. */
export async function getAdmin() {
  const email = (await getServerSession(authOptions))?.user?.email;
  return email ? prisma.admin.findUnique({ where: { email }, select: { id: true, name: true, email: true } }) : null;
}

/** Guard for admin API routes: returns an error response, or null when the request may proceed. */
export async function denyUnlessAdmin(req: Request) {
  if (req.method !== "GET" && !isSameOrigin(req)) {
    return Response.json({ error: "Forbidden: cross-site request rejected." }, { status: 403 });
  }
  if (!(await getAdmin())) {
    return Response.json({ error: "Unauthorized. Please sign in again." }, { status: 401 });
  }
  return null;
}
