import { QrCode, ShieldCheck, Users } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { Brand } from "@/components/ui";
import { getAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin Login" };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (await getAdmin()) redirect("/admin");
  const { callbackUrl } = await searchParams;
  // Only ever return to an admin path on this site (no open redirects).
  const next = typeof callbackUrl === "string" && callbackUrl.startsWith("/admin") ? callbackUrl : "/admin";

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-red-600 via-red-700 to-red-900 p-12 text-white lg:flex">
        <div aria-hidden className="absolute -right-24 -bottom-24 size-96 rounded-full bg-white/10" />
        <Brand onRed />
        <div className="relative">
          <h1 className="text-4xl leading-tight font-bold tracking-tight">Every member.
            <br />
            One place.
          </h1>
          <ul className="mt-8 space-y-3 text-red-50">
            <li className="flex items-center gap-3">
              <Users className="size-5" aria-hidden /> Manage member profiles
            </li>
            <li className="flex items-center gap-3">
              <QrCode className="size-5" aria-hidden /> Share profile links and QR codes
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="size-5" aria-hidden /> Secure admin-only access
            </li>
          </ul>
        </div>
        <p className="relative text-sm text-red-200">BNITRENDZ Member CRM</p>
      </section>

      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Brand />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Admin Login</h2>
          <p className="mt-1 text-sm text-neutral-600">Sign in to manage members.</p>
          <div className="mt-8">
            <LoginForm callbackUrl={next} />
          </div>
        </div>
      </section>
    </main>
  );
}
