import { BriefcaseBusiness, Building2, Cake, Camera, CirclePlay, Globe, Heart, Mail, MapPin, Phone, Users } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InfoRow, type Info } from "@/components/info-row";
import { PublicShell } from "@/components/public-shell";
import { Avatar, card } from "@/components/ui";
import { displayUrl, formatDate, socialHref, socialLabel, websiteHref } from "@/lib/format";
import { getPublicMember } from "@/lib/members";

type Props = PageProps<"/member/[publicToken]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const member = await getPublicMember((await params).publicToken);
  return {
    title: member ? `${member.memberName} · Member Profile` : "Member Not Found",
    robots: { index: false, follow: false },
  };
}

export default async function MemberProfilePage({ params }: Props) {
  const member = await getPublicMember((await params).publicToken);
  if (!member) notFound();

  const details: Info[] = [
    { icon: Phone, label: "Phone", value: member.phone, href: member.phone ? `tel:${member.phone.replace(/[^\d+]/g, "")}` : undefined },
    { icon: MapPin, label: "Address", value: member.address },
    { icon: Cake, label: "Birthday", value: member.birthday && formatDate(member.birthday) },
    { icon: Heart, label: "Anniversary", value: member.anniversary && formatDate(member.anniversary) },
  ];
  const online: Info[] = [
    { icon: Globe, label: "Website", value: member.website && displayUrl(member.website), href: member.website ? websiteHref(member.website) : undefined },
    { icon: Camera, label: "Instagram", value: member.instagram && socialLabel(member.instagram), href: member.instagram ? socialHref("instagram", member.instagram) : undefined },
    { icon: Mail, label: "Email", value: member.email, href: member.email ? `mailto:${member.email}` : undefined },
    { icon: Users, label: "Facebook", value: member.facebook && socialLabel(member.facebook), href: member.facebook ? socialHref("facebook", member.facebook) : undefined },
    { icon: CirclePlay, label: "YouTube", value: member.youtube && socialLabel(member.youtube), href: member.youtube ? socialHref("youtube", member.youtube) : undefined },
  ];
  const sections = [
    { title: "Details", rows: details.filter((row) => row.value) },
    { title: "Connect", rows: online.filter((row) => row.value) },
  ].filter((section) => section.rows.length);

  return (
    <PublicShell>
      <article className={`${card} overflow-hidden`}>
        <div className="flex flex-col items-center px-6 pt-8 pb-6 text-center">
          <Avatar name={member.memberName} className="size-20 text-2xl ring-4 ring-red-50" />
          <p className="mt-4 text-xs font-bold tracking-widest text-red-600 uppercase">Member Profile</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight break-words sm:text-3xl">{member.memberName}</h1>
          {member.companyName && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-neutral-600">
              <Building2 className="size-4 shrink-0" aria-hidden /> {member.companyName}
            </p>
          )}
          {member.businessCategory && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-700">
              <BriefcaseBusiness className="size-4 shrink-0" aria-hidden /> {member.businessCategory}
            </p>
          )}
        </div>

        {sections.map((section) => (
          <section key={section.title} className="border-t border-neutral-100 px-3 py-4 sm:px-5">
            <h2 className="px-3 pb-1 text-xs font-bold tracking-widest text-neutral-400 uppercase">{section.title}</h2>
            <ul>
              {section.rows.map((row) => (
                <InfoRow key={row.label} {...row} />
              ))}
            </ul>
          </section>
        ))}
      </article>
      <p className="mt-6 text-center text-xs text-neutral-500">Shared via BNITRENDZ</p>
    </PublicShell>
  );
}
