import { PageHeaderSkeleton, FiltersBarSkeleton, TableSkeleton } from "@/components/SkeletonLoader";

export default function InvoicesLoading() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
      <PageHeaderSkeleton />
      <FiltersBarSkeleton />
      <TableSkeleton rows={7} columns={6} />
    </div>
  );
}
