import {
  PageHeaderSkeleton,
  TabsSkeleton,
  FiltersBarSkeleton,
  TableSkeleton,
} from "@/components/SkeletonLoader";

export default function PartnersLoading() {
  return (
    <div className="space-y-6 py-2">
      <PageHeaderSkeleton titleWidth="w-52" hasButton={true} />
      <TabsSkeleton count={2} />
      <FiltersBarSkeleton />
      <TableSkeleton rows={8} columns={5} />
    </div>
  );
}
