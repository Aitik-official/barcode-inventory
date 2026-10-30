import {
  PageHeaderSkeleton,
  StatsCardsSkeleton,
  TabsSkeleton,
  FiltersBarSkeleton,
  TableSkeleton,
} from "@/components/SkeletonLoader";

export default function OrdersLoading() {
  return (
    <div className="space-y-6 py-2">
      <PageHeaderSkeleton titleWidth="w-64" hasButton={true} />
      <StatsCardsSkeleton count={4} />
      <TabsSkeleton count={4} />
      <FiltersBarSkeleton />
      <TableSkeleton rows={8} columns={7} />
    </div>
  );
}
