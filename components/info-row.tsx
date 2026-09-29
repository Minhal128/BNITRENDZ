import type { LucideIcon } from "lucide-react";

export type Info = { icon: LucideIcon; label: string; value?: string | null; href?: string };

/** One labelled fact with an icon; links to external sites open in a new tab without leaking the opener. */
export function InfoRow({ icon: Icon, label, value, href }: Info) {
  const body = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-medium tracking-wide text-neutral-500 uppercase">{label}</span>
        <span className={`block font-medium break-words ${value ? "text-neutral-900" : "text-neutral-400"}`}>
          {value || "—"}
        </span>
      </span>
    </>
  );
  const row = "flex items-center gap-4 rounded-xl px-3 py-2.5";
  return (
    <li>
      {href && value ? (
        <a
          href={href}
          {...(href.startsWith("http") && { target: "_blank", rel: "noopener noreferrer" })}
          className={`${row} transition-colors hover:bg-red-50/70 focus-visible:ring-4 focus-visible:ring-red-500/25 focus-visible:outline-none`}
        >
          {body}
        </a>
      ) : (
        <div className={row}>{body}</div>
      )}
    </li>
  );
}
