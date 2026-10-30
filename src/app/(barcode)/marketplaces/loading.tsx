import { PageHeaderSkeleton, StatsCardsSkeleton, TabsSkeleton, TableSkeleton } from "@/components/SkeletonLoader";

export default function MarketplacesLoading() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
      <PageHeaderSkeleton />
      <StatsCardsSkeleton count={3} />
      <TabsSkeleton count={3} />
      <TableSkeleton rows={6} columns={5} />
    </div>
  );
}
