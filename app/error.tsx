"use client";

import { TriangleAlert } from "lucide-react";
import { btnPrimary, card } from "@/components/ui";

// Details stay in the server logs; users only ever see this message.
export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-neutral-50 px-4">
      <div role="alert" className={`${card} w-full max-w-md px-6 py-10 text-center`}>
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-red-50 text-red-600">
          <TriangleAlert className="size-7" aria-hidden />
        </div>
        <h1 className="mt-5 text-xl font-bold tracking-tight">Something went wrong</h1>
        <p className="mt-2 text-sm text-neutral-600">We couldn&apos;t load this page. Please try again in a moment.</p>
        <button type="button" onClick={() => retry()} className={`${btnPrimary} mt-7`}>
          Try again
        </button>
      </div>
    </main>
  );
}
