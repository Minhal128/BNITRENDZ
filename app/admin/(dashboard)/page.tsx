import { ArrowRight, CalendarDays, ExternalLink, Link2, UserPlus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { Avatar, btnSecondary, card } from "@/components/ui";
import { APP_URL, formatDate, photoUrl } from "@/lib/format";
import { getMemberStats } from "@/lib/members";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [stats, recent] = await Promise.all([
    getMemberStats(),
    prisma.member.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, publicToken: true, memberName: true, companyName: true, photoUpdatedAt: true, createdAt: true },
    }),
  ]);
  const timeZone = process.env.APP_TIMEZONE || "UTC";
  const registrationUrl = `${APP_URL}/member/register`;
  const cards = [
    { label: "Total Members", value: stats.total, icon: Users },
    { label: "Members Added Today", value: stats.today, icon: UserPlus },
    { label: "Members Added This Month", value: stats.month, icon: CalendarDays },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-600">An overview of your member network.</p>
      </header>

      <section aria-label="Member statistics" className="grid gap-4 sm:grid-cols-3">
        {cards.map(({ label, value, icon: Icon }, i) => (
          <div
            key={label}
            className={
              i === 0
                ? "rounded-2xl bg-gradient-to-br from-red-600 to-red-800 p-5 text-white shadow-lg shadow-red-600/20"
                : `${card} p-5`
            }
          >
            <div className="flex items-center justify-between">
              <p className={`text-sm font-medium ${i === 0 ? "text-red-100" : "text-neutral-600"}`}>{label}</p>
              <span className={`grid size-9 place-items-center rounded-xl ${i === 0 ? "bg-white/15" : "bg-red-50 text-red-600"}`}>
                <Icon className="size-5" aria-hidden />
              </span>
            </div>
            <p className="mt-4 text-4xl font-bold tracking-tight tabular-nums">{value.toLocaleString("en-US")}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className={`${card} lg:col-span-3`}>
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
            <h2 className="font-semibold">Recent Members</h2>
            <Link href="/admin/members" className="inline-flex items-center gap-1 text-sm font-semibold text-red-700 hover:text-red-800">
              View all <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          {recent.length ? (
            <ul className="divide-y divide-neutral-100">
              {recent.map((member) => (
                <li key={member.id}>
                  <Link
                    href={`/admin/members/${member.id}`}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-red-50/50 focus-visible:bg-red-50 focus-visible:outline-none"
                  >
                    <Avatar name={member.memberName} src={photoUrl(member)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{member.memberName}</span>
                      <span className="block truncate text-sm text-neutral-500">{member.companyName ?? "No company"}</span>
                    </span>
                    <span className="text-xs whitespace-nowrap text-neutral-500">{formatDate(member.createdAt, timeZone)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-12 text-center">
              <p className="font-medium">No members yet</p>
              <p className="mt-1 text-sm text-neutral-500">Share the registration link to get your first sign-ups.</p>
            </div>
          )}
        </section>

        <section className={`${card} p-5 lg:col-span-2`}>
          <span className="grid size-10 place-items-center rounded-xl bg-red-50 text-red-600">
            <Link2 className="size-5" aria-hidden />
          </span>
          <h2 className="mt-4 font-semibold">Registration Link</h2>
          <p className="mt-1 text-sm text-neutral-600">Share this link so new members can register themselves.</p>
          <p className="mt-4 rounded-xl bg-neutral-50 px-3 py-2 font-mono text-[13px] break-all text-neutral-800 select-all">
            {registrationUrl}
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <CopyButton url={registrationUrl} />
            <a href={registrationUrl} target="_blank" rel="noopener noreferrer" className={btnSecondary}>
              <ExternalLink className="size-4" aria-hidden /> Open Form
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
