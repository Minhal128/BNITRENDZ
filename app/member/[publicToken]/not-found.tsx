import { UserX } from "lucide-react";
import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { btnPrimary, card } from "@/components/ui";

export default function MemberNotFound() {
  return (
    <PublicShell>
      <div className={`${card} px-6 py-12 text-center`}>
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-red-50 text-red-600">
          <UserX className="size-8" aria-hidden />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">Member Not Found</h1>
        <p className="mt-2 text-neutral-600">This member profile is no longer available.</p>
        <Link href="/member/register" className={`${btnPrimary} mt-8`}>
          Go to Registration
        </Link>
      </div>
    </PublicShell>
  );
}
