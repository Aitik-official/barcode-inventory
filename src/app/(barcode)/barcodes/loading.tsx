import {
  PageHeaderSkeleton,
  StatsCardsSkeleton,
  FiltersBarSkeleton,
  TableSkeleton,
} from "@/components/SkeletonLoader";

export default function BarcodesLoading() {
  return (
    <div className="space-y-6 py-2">
      <PageHeaderSkeleton titleWidth="w-60" hasButton={true} />
      <StatsCardsSkeleton count={3} />
      <FiltersBarSkeleton />
      <TableSkeleton rows={10} columns={6} />
    </div>
  );
}
