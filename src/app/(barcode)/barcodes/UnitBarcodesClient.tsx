"use client";

import { useState, useMemo, useEffect } from "react";
import { PrintLabelDialog } from "@/components/PrintLabelDialog";
import { BarcodeSvg } from "@/components/BarcodeSvg";
import { Pagination } from "@/components/Pagination";
import {
  ScanBarcode,
  Printer,
  Search,
  SlidersHorizontal,
  CheckCircle2,
  ShoppingBag,
  Layers,
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
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset page to 1 if filter or unitBarcodes list changes
  useEffect(() => {
    setCurrentPage(1);
  }, [initialSearch, initialStatus, unitBarcodes.length]);

  const paginatedUnits = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return unitBarcodes.slice(startIndex, startIndex + pageSize);
  }, [unitBarcodes, currentPage, pageSize]);

  const handlePrint = (unit: any) => {
    setSelectedUnit(unit);
    setIsPrintOpen(true);
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
            defaultValue={initialStatus || "AVAILABLE"}
            className="bg-white border border-[#cce7ed] rounded-lg px-3 py-2 text-xs text-[#0b252c] font-semibold focus:outline-none focus:ring-2 focus:ring-[#056468]"
          >
            <option value="AVAILABLE">Available in Stock (Active)</option>
            <option value="ALL">All Barcodes (Include Sold)</option>
            <option value="SOLD">Sold / Scanned Only</option>
            <option value="RETIRED">Retired Only</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-white hover:bg-[#f0f8fa] text-[#056468] font-medium text-xs rounded-lg border border-[#cce7ed] shadow-sm transition-colors flex items-center justify-center gap-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter</span>
          </button>
        </form>
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
        <Pagination
          currentPage={currentPage}
          totalItems={unitBarcodes.length}
          pageSize={pageSize}
          pageSizeOptions={[10, 25, 50, 100]}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
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

