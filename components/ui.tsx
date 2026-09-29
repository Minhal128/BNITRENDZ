import Image from "next/image";
import { initials } from "@/lib/format";

const btn =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-60";

export const btnPrimary = `${btn} bg-red-600 text-white shadow-sm shadow-red-600/25 hover:bg-red-700 focus-visible:ring-red-500/30`;
export const btnSecondary = `${btn} border border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50 focus-visible:ring-neutral-400/25`;
export const btnDanger = `${btn} border border-red-200 bg-white text-red-700 hover:border-red-300 hover:bg-red-50 focus-visible:ring-red-500/25`;
export const iconBtn =
  "inline-flex size-9 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-500/25";
export const inputCls =
  "block w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-[15px] text-neutral-900 shadow-sm transition placeholder:text-neutral-400 focus:border-red-500 focus:outline-none focus:ring-4 focus:ring-red-500/15 aria-[invalid=true]:border-red-600 aria-[invalid=true]:bg-red-50/40";
export const card = "rounded-2xl border border-neutral-200 bg-white shadow-sm";

export function Avatar({ name, className = "size-10 text-sm" }: { name: string; className?: string }) {
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full bg-red-100 font-bold text-red-700 ${className}`}>
      {initials(name)}
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  const radius = className.includes("rounded") ? "" : "rounded-lg";
  return <div aria-hidden className={`animate-pulse bg-neutral-200/70 ${radius} ${className}`} />;
}

export function Brand({ onRed = false }: { onRed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
      <Image
        src="/logo.jpeg"
        alt=""
        width={40}
        height={40}
        priority
        className={`size-10 rounded-xl object-cover shadow-sm ${onRed ? "ring-2 ring-white/80" : ""}`}
      />
      <span className={onRed ? "text-white" : "text-neutral-900"}>
        BNI<span className={onRed ? "text-red-100" : "text-red-600"}>TRENDZ</span>
      </span>
    </span>
  );
}
