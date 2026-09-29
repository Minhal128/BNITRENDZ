"use client";

import { Search } from "lucide-react";
import Form from "next/form";
import { btnSecondary, inputCls } from "./ui";

/** Plain GET form: search and sort live in the URL, so results are shareable and the back button works. */
export function MembersToolbar({ search, sort, limit }: { search: string; sort: string; limit: number }) {
  return (
    <Form key={`${search}|${sort}`} action="/admin/members" role="search" className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <label htmlFor="search" className="sr-only">
          Search members
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-neutral-400" aria-hidden />
        <input
          id="search"
          name="search"
          type="search"
          defaultValue={search}
          maxLength={100}
          placeholder="Search name, company, email or phone"
          className={`${inputCls} pl-10`}
        />
      </div>
      <label htmlFor="sort" className="sr-only">
        Sort by
      </label>
      <select
        id="sort"
        name="sort"
        defaultValue={sort}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={`${inputCls} sm:w-44`}
      >
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="name_asc">Name A–Z</option>
        <option value="name_desc">Name Z–A</option>
      </select>
      {limit !== 20 && <input type="hidden" name="limit" value={limit} />}
      <button type="submit" className={btnSecondary}>
        Search
      </button>
    </Form>
  );
}
