"use client";

import { useState, useMemo, useEffect } from "react";
import { PrintLabelDialog } from "@/components/PrintLabelDialog";
import { BarcodeSvg } from "@/components/BarcodeSvg";
import {
  ScanBarcode,
  Printer,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  ShoppingBag,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export default function UnitBarcodesClient({
  unitBarcodes,
  stats,
  initialSearch,
  initialStatus,
}: {
  unitBarcodes: any[];
  stats: { totalCount: number; availableCount: number; soldCount: number };
  initialSearch: string;
  initialStatus: string;
}) {
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  // Pagination state
  const [pageSize, setPageSize] = useState<number | "ALL">(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset page to 1 if filter or unitBarcodes list changes
  useEffect(() => {
    setCurrentPage(1);
  }, [initialSearch, initialStatus, unitBarcodes.length]);

  const totalItems = unitBarcodes.length;
  const totalPages =
    pageSize === "ALL"
      ? 1
      : Math.max(1, Math.ceil(totalItems / (typeof pageSize === "number" ? pageSize : 10)));

  // Clamp current page
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex =
    pageSize === "ALL" ? 0 : (safePage - 1) * (pageSize as number);
  const endIndex =
    pageSize === "ALL"
      ? totalItems
      : Math.min(startIndex + (pageSize as number), totalItems);

  const paginatedUnits = useMemo(() => {
    if (pageSize === "ALL") return unitBarcodes;
    return unitBarcodes.slice(startIndex, endIndex);
  }, [unitBarcodes, startIndex, endIndex, pageSize]);

  const handlePrint = (unit: any) => {
    setSelectedUnit(unit);
    setIsPrintOpen(true);
  };

  const handlePageSizeChange = (newSize: string) => {
    if (newSize === "ALL") {
      setPageSize("ALL");
    } else {
      setPageSize(Number(newSize));
    }
    setCurrentPage(1);
  };

  // Generate page numbers to show
  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safePage <= 3) {
      return [1, 2, 3, 4, 5];
    }
    if (safePage >= totalPages - 2) {
      return [
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }
    return [safePage - 2, safePage - 1, safePage, safePage + 1, safePage + 2];
  };

  return (
    <div className="space-y-6 py-2">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#cce7ed] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#0b252c] flex items-center gap-2">
            <ScanBarcode className="w-5 h-5 text-[#056468]" />
            <span>Unit Barcode Series Registry</span>
          </h1>
          <p className="text-xs text-[#4a6870] font-normal mt-1">
            Track, filter, and print unique 12-digit Code 128 barcodes assigned to individual inventory units.
          </p>
        </div>
      </div>

      {/* Metric Cards - Deep Teal Theme */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-[#056468] text-white rounded-xl p-5 shadow-md border border-[#044e51] space-y-2">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-emerald-200">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-normal text-emerald-100/80">Total Serial Barcodes</div>
            <div className="text-2xl font-bold text-white mt-0.5">{stats.totalCount}</div>
          </div>
          <div className="text-[11px] text-emerald-200 font-medium">Sequential Code 128 Engine</div>
        </div>

        <div className="bg-[#056468] text-white rounded-xl p-5 shadow-md border border-[#044e51] space-y-2">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-emerald-200">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-normal text-emerald-100/80">Available Units in Stock</div>
            <div className="text-2xl font-bold text-emerald-200 mt-0.5">{stats.availableCount}</div>
          </div>
          <div className="text-[11px] text-emerald-100/70 font-medium">Ready for POS Scan & Order</div>
        </div>

        <div className="bg-[#056468] text-white rounded-xl p-5 shadow-md border border-[#044e51] space-y-2">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-emerald-200">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-normal text-emerald-100/80">Sold / Fulfilled Units</div>
            <div className="text-2xl font-bold text-white mt-0.5">{stats.soldCount}</div>
          </div>
          <div className="text-[11px] text-emerald-100/70 font-medium">Completed Customer Orders</div>
        </div>
      </div>

      {/* Filter Form & Top Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form method="GET" className="flex flex-1 flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[#5f818b]" />
            <input
              type="text"
              name="search"
              defaultValue={initialSearch}
              placeholder="Search by barcode string, SKU code, or product name..."
              className="w-full bg-white border border-[#cce7ed] rounded-lg pl-9 pr-4 py-2 text-xs text-[#0b252c] placeholder-[#6a8c96] focus:outline-none focus:ring-2 focus:ring-[#056468]"
            />
          </div>

          <select
            name="status"
            defaultValue={initialStatus}
            className="bg-white border border-[#cce7ed] rounded-lg px-3 py-2 text-xs text-[#0b252c] focus:outline-none focus:ring-2 focus:ring-[#056468]"
          >
            <option value="">All Statuses</option>
            <option value="AVAILABLE">AVAILABLE Only</option>
            <option value="SOLD">SOLD Only</option>
            <option value="RETIRED">RETIRED Only</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-white hover:bg-[#f0f8fa] text-[#056468] font-medium text-xs rounded-lg border border-[#cce7ed] shadow-sm transition-colors flex items-center justify-center gap-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter</span>
          </button>
        </form>

        {/* Page Size Selector */}
        <div className="flex items-center gap-2 self-end md:self-auto bg-white border border-[#cce7ed] rounded-lg px-3 py-1.5 shadow-xs text-xs">
          <span className="text-[#4a6870] font-medium">Show:</span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(e.target.value)}
            className="bg-transparent font-semibold text-[#056468] focus:outline-none cursor-pointer"
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
            <option value="ALL">Show All ({totalItems})</option>
          </select>
        </div>
      </div>

      {/* Barcodes Registry Table */}
      <div className="bg-white border border-[#cce7ed] rounded-xl p-5 shadow-sm space-y-4">
        <div className="overflow-x-auto rounded-lg border border-[#cce7ed]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f0f8fa] text-[#0b252c] font-semibold uppercase tracking-wider border-b border-[#cce7ed]">
              <tr>
                <th className="p-3">Barcode String</th>
                <th className="p-3">Visual Code 128</th>
                <th className="p-3">Product Name</th>
                <th className="p-3">SKU</th>
                <th className="p-3">Unit Serial #</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Thermal Label</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#cce7ed] text-[#0b252c] font-normal">
              {paginatedUnits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#5f818b]">
                    No unit barcodes found matching filters.
                  </td>
                </tr>
              ) : (
                paginatedUnits.map((unit: any) => (
                  <tr key={unit.id} className="hover:bg-[#f8fcfe] transition-colors">
                    <td className="p-3 font-mono font-semibold text-[#0b252c] tracking-wider">
                      {unit.barcode}
                    </td>
                    <td className="p-3">
                      <div className="bg-white p-1 rounded border border-[#cce7ed] inline-block shadow-xs">
                        <BarcodeSvg barcode={unit.barcode} height={22} width={1.2} fontSize={8} />
                      </div>
                    </td>
                    <td className="p-3 font-semibold text-[#0b252c]">
                      {unit.productVariant.product.name}
                    </td>
                    <td className="p-3 text-[#5f818b] font-mono text-[11px]">
                      {unit.productVariant.sku}
                    </td>
                    <td className="p-3 text-[#056468] font-medium">Unit #{unit.serialNumber}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          unit.status === "AVAILABLE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : unit.status === "SOLD"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {unit.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handlePrint(unit)}
                        className="px-3 py-1.5 bg-[#056468] hover:bg-[#044e51] text-white font-medium text-[11px] rounded-lg shadow-xs transition-all inline-flex items-center gap-1"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Print</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-[#cce7ed] text-xs">
          <div className="text-[#4a6870]">
            Showing{" "}
            <span className="font-bold text-[#0b252c]">
              {totalItems === 0 ? 0 : startIndex + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold text-[#0b252c]">{endIndex}</span> of{" "}
            <span className="font-bold text-[#0b252c]">{totalItems}</span> barcodes
          </div>

          {pageSize !== "ALL" && totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              {/* First Page */}
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={safePage === 1}
                className="p-1.5 rounded-lg border border-[#cce7ed] bg-white text-[#0b252c] hover:bg-[#f0f8fa] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              {/* Prev Page */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-1.5 rounded-lg border border-[#cce7ed] bg-white text-[#0b252c] hover:bg-[#f0f8fa] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Numbered Page Buttons */}
              {getPageNumbers().map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCurrentPage(num)}
                  className={`min-w-[32px] h-8 px-2 rounded-lg font-semibold text-xs transition-all ${
                    safePage === num
                      ? "bg-[#056468] text-white shadow-xs"
                      : "bg-white border border-[#cce7ed] text-[#0b252c] hover:bg-[#f0f8fa]"
                  }`}
                >
                  {num}
                </button>
              ))}

              {/* Next Page */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="p-1.5 rounded-lg border border-[#cce7ed] bg-white text-[#0b252c] hover:bg-[#f0f8fa] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Last Page */}
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safePage === totalPages}
                className="p-1.5 rounded-lg border border-[#cce7ed] bg-white text-[#0b252c] hover:bg-[#f0f8fa] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Label Print Dialog */}
      {isPrintOpen && selectedUnit && (
        <PrintLabelDialog
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          productName={selectedUnit.productVariant.product.name}
          sku={selectedUnit.productVariant.sku}
          price={
            selectedUnit.productVariant.sellingPrice ||
            selectedUnit.productVariant.product.offerPrice
          }
          barcode={selectedUnit.barcode}
          serialNumber={selectedUnit.serialNumber}
        />
      )}
    </div>
  );
}

