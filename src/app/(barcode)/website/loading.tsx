import { PageHeaderSkeleton, TabsSkeleton, CardsGridSkeleton } from "@/components/SkeletonLoader";

export default function WebsiteLoading() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
      <PageHeaderSkeleton />
      <TabsSkeleton count={4} />
      <CardsGridSkeleton count={6} />
    </div>
  );
}
