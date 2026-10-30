import React from "react";

export function SkeletonBox({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded-lg ${className}`}
      style={style}
    />
  );
}

export function PageHeaderSkeleton({
  titleWidth = "w-48",
  hasButton = true,
}: {
  titleWidth?: string;
  hasButton?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#cce7ed] pb-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <SkeletonBox className={`h-7 ${titleWidth} rounded-lg`} />
          <SkeletonBox className="h-5 w-20 rounded-full" />
        </div>
        <SkeletonBox className="h-4 w-72 rounded" />
      </div>
      {hasButton && (
        <div className="flex items-center gap-2">
          <SkeletonBox className="h-9 w-28 rounded-lg" />
          <SkeletonBox className="h-9 w-32 rounded-lg" />
        </div>
      )}
    </div>
  );
}

export function StatsCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${count} gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-[#cce7ed] rounded-xl p-5 shadow-xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <SkeletonBox className="h-4 w-28 rounded" />
            <SkeletonBox className="h-8 w-8 rounded-lg" />
          </div>
          <SkeletonBox className="h-8 w-24 rounded-lg" />
          <SkeletonBox className="h-3 w-40 rounded" />
        </div>
      ))}
    </div>
  );
}

export function TabsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex items-center gap-2 border-b border-[#cce7ed] pb-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBox key={i} className="h-8 w-32 rounded-lg" />
      ))}
    </div>
  );
}

export function FiltersBarSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-xl border border-[#cce7ed] shadow-xs">
      <SkeletonBox className="h-9 flex-1 w-full rounded-lg" />
      <SkeletonBox className="h-9 w-full sm:w-44 rounded-lg" />
      <SkeletonBox className="h-9 w-full sm:w-24 rounded-lg" />
    </div>
  );
}

export function TableSkeleton({
  rows = 6,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="bg-white border border-[#cce7ed] rounded-xl shadow-xs overflow-hidden">
      <div className="p-4 border-b border-[#cce7ed] flex items-center justify-between">
        <SkeletonBox className="h-5 w-36 rounded" />
        <SkeletonBox className="h-4 w-24 rounded" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f0f8fa] border-b border-[#cce7ed]">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <SkeletonBox className="h-3.5 w-20 rounded" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#cce7ed]/60">
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-slate-50/50">
                {Array.from({ length: columns }).map((_, colIdx) => (
                  <td key={colIdx} className="px-4 py-3.5">
                    {colIdx === 0 ? (
                      <div className="flex items-center gap-3">
                        <SkeletonBox className="h-9 w-9 rounded-lg shrink-0" />
                        <div className="space-y-1.5 flex-1">
                          <SkeletonBox className="h-3.5 w-36 rounded" />
                          <SkeletonBox className="h-2.5 w-20 rounded" />
                        </div>
                      </div>
                    ) : colIdx === columns - 1 ? (
                      <div className="flex justify-end gap-2">
                        <SkeletonBox className="h-7 w-16 rounded-md" />
                      </div>
                    ) : (
                      <SkeletonBox
                        className={`h-3.5 rounded ${
                          colIdx % 2 === 0 ? "w-24" : "w-16"
                        }`}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-3 border-t border-[#cce7ed] flex items-center justify-between">
        <SkeletonBox className="h-4 w-32 rounded" />
        <div className="flex items-center gap-1.5">
          <SkeletonBox className="h-8 w-20 rounded-lg" />
          <SkeletonBox className="h-8 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function CardsGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white border border-[#cce7ed] rounded-xl p-4 shadow-xs space-y-3"
        >
          <SkeletonBox className="h-36 w-full rounded-lg" />
          <div className="space-y-1.5">
            <SkeletonBox className="h-4 w-3/4 rounded" />
            <SkeletonBox className="h-3 w-1/2 rounded" />
          </div>
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <SkeletonBox className="h-5 w-20 rounded" />
            <SkeletonBox className="h-7 w-20 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function UniversalPageSkeleton() {
  return (
    <div className="space-y-6 py-2">
      <PageHeaderSkeleton />
      <StatsCardsSkeleton count={3} />
      <TabsSkeleton count={3} />
      <FiltersBarSkeleton />
      <TableSkeleton rows={8} columns={5} />
    </div>
  );
}
