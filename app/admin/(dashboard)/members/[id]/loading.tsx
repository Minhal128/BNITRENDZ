import { Skeleton, card } from "@/components/ui";

export default function MemberLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading member">
      <Skeleton className="h-4 w-24" />
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className={`${card} grid gap-5 p-6 sm:grid-cols-2 lg:col-span-2`}>
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="size-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
        <div className={`${card} flex flex-col items-center gap-4 p-6`}>
          <Skeleton className="size-52 rounded-3xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
