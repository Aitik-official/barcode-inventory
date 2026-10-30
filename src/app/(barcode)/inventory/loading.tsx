import {
  PageHeaderSkeleton,
  StatsCardsSkeleton,
  TabsSkeleton,
  FiltersBarSkeleton,
  TableSkeleton,
} from "@/components/SkeletonLoader";

export default function InventoryLoading() {
  return (
    <div className="space-y-6 py-2">
      <PageHeaderSkeleton titleWidth="w-56" hasButton={true} />
      <StatsCardsSkeleton count={3} />
      <TabsSkeleton count={4} />
      <FiltersBarSkeleton />
      <TableSkeleton rows={8} columns={6} />
    </div>
  );
}
