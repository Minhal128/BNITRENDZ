import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MemberForm } from "@/components/member-form";
import { card } from "@/components/ui";

export const metadata: Metadata = { title: "Add Member" };

export default function NewMemberPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/admin/members" className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-red-700">
        <ArrowLeft className="size-4" aria-hidden /> Members
      </Link>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Add Member</h1>
        <p className="mt-1 text-sm text-neutral-600">A public profile link and QR code are created automatically.</p>
      </header>
      <div className={`${card} p-5 sm:p-8`}>
        <MemberForm mode="create" />
      </div>
    </div>
  );
}
