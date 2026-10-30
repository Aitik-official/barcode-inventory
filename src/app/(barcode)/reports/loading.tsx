import { PageHeaderSkeleton, StatsCardsSkeleton, TableSkeleton } from "@/components/SkeletonLoader";

export default function ReportsLoading() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
      <PageHeaderSkeleton />
      <StatsCardsSkeleton count={4} />
      <TableSkeleton rows={8} columns={5} />
    </div>
  );
}
