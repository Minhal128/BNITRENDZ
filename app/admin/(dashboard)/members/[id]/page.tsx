import { ArrowLeft, BriefcaseBusiness, Building2, Cake, Camera, CirclePlay, Globe, Heart, Mail, MapPin, Pencil, Phone, UserRound, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InfoRow, type Info } from "@/components/info-row";
import { DeleteMemberButton } from "@/components/member-actions";
import { QrCard } from "@/components/qr-card";
import { WhatsAppButton } from "@/components/whatsapp-composer";
import { Avatar, btnPrimary, card } from "@/components/ui";
import { displayUrl, formatDate, photoUrl, profileUrl, socialHref, socialLabel, websiteHref } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Member Details" };

export default async function MemberDetailPage({ params }: PageProps<"/admin/members/[id]">) {
  const member = await prisma.member.findUnique({ where: { id: (await params).id } });
  if (!member) notFound();
  const timeZone = process.env.APP_TIMEZONE || "UTC";

  const info: Info[] = [
    { icon: UserRound, label: "Member Name", value: member.memberName },
    { icon: Building2, label: "Company Name", value: member.companyName },
    { icon: BriefcaseBusiness, label: "Business Category", value: member.businessCategory },
    { icon: Phone, label: "Phone Number", value: member.phone, href: member.phone ? `tel:${member.phone.replace(/[^\d+]/g, "")}` : undefined },
    { icon: Mail, label: "Email", value: member.email, href: member.email ? `mailto:${member.email}` : undefined },
    { icon: MapPin, label: "Address", value: member.address },
    { icon: Cake, label: "Birthday", value: member.birthday && formatDate(member.birthday) },
    { icon: Heart, label: "Anniversary", value: member.anniversary && formatDate(member.anniversary) },
  ];
  const online: Info[] = [
    { icon: Globe, label: "Website", value: member.website && displayUrl(member.website), href: member.website ? websiteHref(member.website) : undefined },
    { icon: Camera, label: "Instagram", value: member.instagram && socialLabel(member.instagram), href: member.instagram ? socialHref("instagram", member.instagram) : undefined },
    { icon: Users, label: "Facebook", value: member.facebook && socialLabel(member.facebook), href: member.facebook ? socialHref("facebook", member.facebook) : undefined },
    { icon: CirclePlay, label: "YouTube", value: member.youtube && socialLabel(member.youtube), href: member.youtube ? socialHref("youtube", member.youtube) : undefined },
  ];

  return (
    <div className="space-y-6">
      <Link href="/admin/members" className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-red-700">
        <ArrowLeft className="size-4" aria-hidden /> Members
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={member.memberName} src={photoUrl(member)} className="size-20 text-2xl" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight break-words">{member.memberName}</h1>
            <p className="text-neutral-600">{member.companyName ?? "No company"}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <WhatsAppButton
            memberId={member.id}
            memberName={member.memberName}
            hasPhone={!!member.phone}
            withLabel
            className="flex-1 sm:flex-none"
          />
          <Link href={`/admin/members/${member.id}/edit`} className={`${btnPrimary} flex-1 sm:flex-none`}>
            <Pencil className="size-4" aria-hidden /> Edit
          </Link>
          <DeleteMemberButton memberId={member.id} memberName={member.memberName} redirectTo="/admin/members" withLabel />
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {[
            { title: "Member Information", rows: info },
            { title: "Online Presence", rows: online },
          ].map((section) => (
            <section key={section.title} className={`${card} p-3 sm:p-4`}>
              <h2 className="px-3 pt-1 pb-2 font-semibold">{section.title}</h2>
              <ul className="grid sm:grid-cols-2">
                {section.rows.map((row) => (
                  <InfoRow key={row.label} {...row} />
                ))}
              </ul>
            </section>
          ))}
          <p className="px-1 text-xs text-neutral-500">
            Added {formatDate(member.createdAt, timeZone)} · Last updated {formatDate(member.updatedAt, timeZone)}
          </p>
        </div>

        <section className={`${card} p-5 sm:p-6`}>
          <h2 className="mb-5 font-semibold">Public Profile &amp; QR Code</h2>
          <QrCard url={profileUrl(member.publicToken)} memberName={member.memberName} openLabel="Open Public Profile" share />
        </section>
      </div>
    </div>
  );
}
