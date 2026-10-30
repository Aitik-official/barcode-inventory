import { PageHeaderSkeleton, SkeletonBox } from "@/components/SkeletonLoader";

export default function ScanLoading() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <SkeletonBox className="h-14 rounded-xl" />
          <SkeletonBox className="h-44 rounded-xl" />
        </div>
        <div className="lg:col-span-5 space-y-4">
          <SkeletonBox className="h-64 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
