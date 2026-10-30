import {
  PageHeaderSkeleton,
  TabsSkeleton,
  FiltersBarSkeleton,
  CardsGridSkeleton,
} from "@/components/SkeletonLoader";

export default function ProductsLoading() {
  return (
    <div className="space-y-6 py-2">
      <PageHeaderSkeleton titleWidth="w-56" hasButton={true} />
      <TabsSkeleton count={3} />
      <FiltersBarSkeleton />
      <CardsGridSkeleton count={8} />
    </div>
  );
}
