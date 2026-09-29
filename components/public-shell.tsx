import type { ReactNode } from "react";
import { Brand } from "./ui";

/** Red hero band with a white card overlapping it, shared by the public member pages. */
export function PublicShell({ title, intro, children }: { title?: string; intro?: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-neutral-50">
      <header className="relative overflow-hidden bg-gradient-to-br from-red-600 via-red-700 to-red-900 pt-7 pb-28 text-white">
        <div aria-hidden className="absolute -top-24 -right-20 size-72 rounded-full bg-white/10" />
        <div aria-hidden className="absolute top-24 -left-16 size-48 rounded-full bg-white/5" />
        <div className="relative mx-auto max-w-2xl px-4 sm:px-6">
          <Brand onRed />
          {title && <h1 className="mt-10 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>}
          {intro && <p className="mt-2 max-w-lg text-red-100">{intro}</p>}
        </div>
      </header>
      <main className="relative mx-auto -mt-20 max-w-2xl px-4 pb-16 sm:px-6">{children}</main>
    </div>
  );
}
