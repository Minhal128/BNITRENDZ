import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MemberForm } from "@/components/member-form";
import { card } from "@/components/ui";
import { photoUrl, toDateInput } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Edit Member" };

export default async function EditMemberPage({ params }: PageProps<"/admin/members/[id]/edit">) {
  const member = await prisma.member.findUnique({ where: { id: (await params).id } });
  if (!member) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/admin/members/${member.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-red-700"
      >
        <ArrowLeft className="size-4" aria-hidden /> {member.memberName}
      </Link>
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Edit Member</h1>
        <p className="mt-1 text-sm text-neutral-600">The public profile link and QR code stay the same after editing.</p>
      </header>
      <div className={`${card} p-5 sm:p-8`}>
        <MemberForm
          mode="edit"
          memberId={member.id}
          initialValues={{
            memberName: member.memberName,
            companyName: member.companyName ?? "",
            businessCategory: member.businessCategory ?? "",
            phone: member.phone ?? "",
            address: member.address ?? "",
            birthday: toDateInput(member.birthday),
            anniversary: toDateInput(member.anniversary),
            website: member.website ?? "",
            instagram: member.instagram ?? "",
            email: member.email ?? "",
            facebook: member.facebook ?? "",
            youtube: member.youtube ?? "",
            photo: photoUrl(member) ?? "",
          }}
        />
      </div>
    </div>
  );
}
