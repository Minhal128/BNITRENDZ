import { PublicShell } from "@/components/public-shell";
import { Skeleton, card } from "@/components/ui";

export default function ProfileLoading() {
  return (
    <PublicShell>
      <div className={`${card} p-6`} role="status" aria-label="Loading member profile">
        <div className="flex flex-col items-center gap-3 pt-2 pb-6">
          <Skeleton className="size-20 rounded-full" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="space-y-4 border-t border-neutral-100 pt-6">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="size-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PublicShell>
  );
}
