import { Skeleton, card } from "@/components/ui";

export default function MembersLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading members">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      <Skeleton className="h-11 w-full rounded-xl" />
      <div className={`${card} divide-y divide-neutral-100`}>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="hidden h-4 flex-1 sm:block" />
            <Skeleton className="hidden h-4 flex-1 md:block" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
