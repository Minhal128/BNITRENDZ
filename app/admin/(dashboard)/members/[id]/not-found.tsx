import { UserX } from "lucide-react";
import Link from "next/link";
import { btnPrimary, card } from "@/components/ui";

export default function AdminMemberNotFound() {
  return (
    <div className={`${card} mx-auto max-w-lg px-6 py-14 text-center`}>
      <div className="mx-auto grid size-14 place-items-center rounded-full bg-red-50 text-red-600">
        <UserX className="size-7" aria-hidden />
      </div>
      <h1 className="mt-4 text-xl font-bold tracking-tight">Member Not Found</h1>
      <p className="mt-1 text-sm text-neutral-600">This member doesn&apos;t exist or has been deleted.</p>
      <Link href="/admin/members" className={`${btnPrimary} mt-6`}>
        Back to Members
      </Link>
    </div>
  );
}
