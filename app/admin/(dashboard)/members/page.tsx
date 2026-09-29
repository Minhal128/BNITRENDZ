import { ChevronLeft, ChevronRight, Eye, Pencil, Plus, SearchX, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { DeleteMemberButton, QrButton } from "@/components/member-actions";
import { SelectMemberCheckbox, SelectPageCheckbox, SelectionBar, SelectionProvider } from "@/components/member-selection";
import { MembersToolbar } from "@/components/members-toolbar";
import { WhatsAppButton } from "@/components/whatsapp-composer";
import { Avatar, btnPrimary, btnSecondary, card, iconBtn } from "@/components/ui";
import { displayUrl, formatDate, photoUrl, websiteHref } from "@/lib/format";
import { listMembers } from "@/lib/members";
import { listQuerySchema, type ListQuery } from "@/lib/validation";

export const metadata: Metadata = { title: "Members" };

type Row = { id: string; publicToken: string; memberName: string; phone: string | null };

function RowActions({ member, labels = false }: { member: Row; labels?: boolean }) {
  const linkCls = labels ? btnSecondary : iconBtn;
  return (
    <div className={labels ? "grid grid-cols-2 gap-2" : "flex justify-end gap-0.5"}>
      <Link href={`/admin/members/${member.id}`} className={linkCls} aria-label={`View ${member.memberName}`} title="View">
        <Eye className="size-4" aria-hidden />
        {labels && "View"}
      </Link>
      <Link href={`/admin/members/${member.id}/edit`} className={linkCls} aria-label={`Edit ${member.memberName}`} title="Edit">
        <Pencil className="size-4" aria-hidden />
        {labels && "Edit"}
      </Link>
      <WhatsAppButton
        memberId={member.id}
        memberName={member.memberName}
        hasPhone={!!member.phone}
        withLabel={labels}
        className={labels ? "order-first col-span-2" : ""}
      />
      <QrButton publicToken={member.publicToken} memberName={member.memberName} withLabel={labels} />
      <DeleteMemberButton memberId={member.id} memberName={member.memberName} withLabel={labels} />
    </div>
  );
}

function pageHref(query: ListQuery, page: number) {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.sort !== "newest") params.set("sort", query.sort);
  if (query.limit !== 20) params.set("limit", String(query.limit));
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/admin/members?${qs}` : "/admin/members";
}

export default async function MembersPage({ searchParams }: PageProps<"/admin/members">) {
  const query = listQuerySchema.parse(await searchParams);
  const { members, total, page, limit, totalPages } = await listMembers(query);
  const timeZone = process.env.APP_TIMEZONE || "UTC";
  const first = total ? Math.min((page - 1) * limit + 1, total) : 0;
  const last = Math.min(page * limit, total);
  const dash = <span className="text-neutral-400">—</span>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Members</h1>
          <p className="mt-1 text-sm text-neutral-600">Search, update and share member profiles.</p>
        </div>
        <Link href="/admin/members/new" className={btnPrimary}>
          <Plus className="size-4" aria-hidden /> Add Member
        </Link>
      </header>

      <MembersToolbar search={query.search} sort={query.sort} limit={query.limit} />

      {members.length === 0 ? (
        <div className={`${card} px-6 py-16 text-center`}>
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-red-50 text-red-600">
            {query.search ? <SearchX className="size-7" aria-hidden /> : <UserPlus className="size-7" aria-hidden />}
          </div>
          <h2 className="mt-4 font-semibold">
            {query.search ? `No members match “${query.search}”` : total ? "No members on this page" : "No members yet"}
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            {query.search
              ? "Try a different name, company, category, email or phone number."
              : total
                ? "This page is past the end of the list."
                : "Share the registration link or add the first member yourself."}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            {query.search || total ? (
              <Link href="/admin/members" className={btnSecondary}>
                {query.search ? "Clear search" : "Go to first page"}
              </Link>
            ) : (
              <Link href="/admin/members/new" className={btnPrimary}>
                <Plus className="size-4" aria-hidden /> Add Member
              </Link>
            )}
          </div>
        </div>
      ) : (
        // Keyed by the filter so a new search starts a fresh selection; it survives paging.
        <SelectionProvider key={`${query.search}|${query.sort}|${query.limit}`} pageIds={members.map((m) => m.id)}>
          <SelectionBar total={total} search={query.search} />

          <div className={`${card} hidden overflow-hidden xl:block`}>
            {/* Fixed layout sized for the xl content width (~944px, 7 columns from 1400px); long values truncate. */}
            <table className="w-full table-fixed text-left text-sm">
              <caption className="sr-only">Members, page {page} of {totalPages}</caption>
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                <tr>
                  <th scope="col" className="w-12 py-3 pr-1 pl-4">
                    <SelectPageCheckbox />
                  </th>
                  <th scope="col" className="w-[22%] px-3 py-3 min-[1400px]:w-[17%]">Member</th>
                  <th scope="col" className="w-[15%] px-3 py-3 min-[1400px]:w-[10%]">Company</th>
                  <th scope="col" className="w-36 px-3 py-3">Phone</th>
                  <th scope="col" className="w-[18%] px-3 py-3 min-[1400px]:w-[14%]">Email</th>
                  <th scope="col" className="hidden w-[9%] px-3 py-3 min-[1400px]:table-cell">Website</th>
                  <th scope="col" className="hidden w-28 px-3 py-3 min-[1400px]:table-cell">Created</th>
                  <th scope="col" className="w-56 px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {members.map((member) => (
                  <tr key={member.id} className="transition-colors hover:bg-red-50/40">
                    <td className="py-3 pr-1 pl-4">
                      <SelectMemberCheckbox id={member.id} name={member.memberName} />
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/admin/members/${member.id}`}
                        className="flex items-center gap-3 rounded-lg font-semibold hover:text-red-700 focus-visible:ring-4 focus-visible:ring-red-500/25 focus-visible:outline-none"
                      >
                        <Avatar name={member.memberName} src={photoUrl(member)} />
                        <span className="min-w-0">
                          <span className="block truncate">{member.memberName}</span>
                          {member.businessCategory && (
                            <span className="block truncate text-xs font-normal text-neutral-500">{member.businessCategory}</span>
                          )}
                        </span>
                      </Link>
                    </td>
                    <td className="truncate px-3 py-3 text-neutral-600">{member.companyName ?? dash}</td>
                    <td className="truncate px-3 py-3 text-neutral-600">{member.phone ?? dash}</td>
                    <td className="truncate px-3 py-3 text-neutral-600">{member.email ?? dash}</td>
                    <td className="hidden truncate px-3 py-3 min-[1400px]:table-cell">
                      {member.website ? (
                        <a
                          href={websiteHref(member.website)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-red-700 hover:underline"
                        >
                          {displayUrl(member.website)}
                        </a>
                      ) : (
                        dash
                      )}
                    </td>
                    <td className="hidden truncate px-3 py-3 text-neutral-500 min-[1400px]:table-cell">
                      {formatDate(member.createdAt, timeZone)}
                    </td>
                    <td className="px-3 py-2">
                      <RowActions member={member} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="grid gap-3 md:grid-cols-2 xl:hidden">
            {members.map((member) => (
              <li key={member.id} className={`${card} p-4`}>
                <div className="flex items-center gap-3">
                  <SelectMemberCheckbox id={member.id} name={member.memberName} />
                  <Avatar name={member.memberName} src={photoUrl(member)} />
                  <div className="min-w-0">
                    <Link href={`/admin/members/${member.id}`} className="block truncate font-semibold hover:text-red-700">
                      {member.memberName}
                    </Link>
                    <p className="truncate text-sm text-neutral-500">
                      {[member.companyName, member.businessCategory].filter(Boolean).join(" · ") || "No company"}
                    </p>
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-neutral-500">Phone</dt>
                  <dd className="truncate">{member.phone ?? dash}</dd>
                  <dt className="text-neutral-500">Email</dt>
                  <dd className="truncate">{member.email ?? dash}</dd>
                  <dt className="text-neutral-500">Website</dt>
                  <dd className="truncate">{member.website ? displayUrl(member.website) : dash}</dd>
                  <dt className="text-neutral-500">Created</dt>
                  <dd>{formatDate(member.createdAt, timeZone)}</dd>
                </dl>
                <div className="mt-4 border-t border-neutral-100 pt-3">
                  <RowActions member={member} labels />
                </div>
              </li>
            ))}
          </ul>
        </SelectionProvider>
      )}

      <nav aria-label="Pagination" className="flex flex-col items-center justify-between gap-3 sm:flex-row">
        <p className="text-sm text-neutral-600">
          {total ? `Showing ${first}–${last} of ${total} results` : "0 results"}
        </p>
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link href={pageHref(query, page - 1)} className={btnSecondary} rel="prev">
              <ChevronLeft className="size-4" aria-hidden /> Previous
            </Link>
          ) : (
            <span className={`${btnSecondary} pointer-events-none opacity-50`} aria-disabled="true">
              <ChevronLeft className="size-4" aria-hidden /> Previous
            </span>
          )}
          <span className="px-2 text-sm font-medium whitespace-nowrap text-neutral-700" aria-current="page">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={pageHref(query, page + 1)} className={btnSecondary} rel="next">
              Next <ChevronRight className="size-4" aria-hidden />
            </Link>
          ) : (
            <span className={`${btnSecondary} pointer-events-none opacity-50`} aria-disabled="true">
              Next <ChevronRight className="size-4" aria-hidden />
            </span>
          )}
        </div>
      </nav>
    </div>
  );
}
