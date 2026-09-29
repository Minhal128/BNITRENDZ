import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin-nav";
import { getAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <div className="min-h-dvh bg-neutral-50 lg:pl-64">
      <AdminNav name={admin.name} email={admin.email} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
