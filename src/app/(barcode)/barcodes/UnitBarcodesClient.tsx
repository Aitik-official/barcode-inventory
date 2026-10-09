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
  X,
  ExternalLink,
  Tag,
} from "lucide-react";

export default function UnitBarcodesClient({
  unitBarcodes,
  stats,
  initialSearch = "",
  initialStatus = "ALL",
}: {
  unitBarcodes: any[];
  stats: { totalCount: number; availableCount: number; soldCount: number };
  initialSearch: string;
  initialStatus: string;
}) {
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  // Filter state
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus || "ALL");

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Filter unitBarcodes dynamically
  const filteredBarcodes = useMemo(() => {
    return unitBarcodes.filter((unit) => {
      // 1. Status Filter
      if (statusFilter !== "ALL" && unit.status !== statusFilter) {
        return false;
      }

      // 2. Search Filter
      if (!search.trim()) return true;
      const clean = search.trim().toLowerCase();
      const cleanAlpha = clean.replace(/[^a-z0-9]/g, "");

      const bc = (unit.barcode || "").toLowerCase();
      const bcAlpha = bc.replace(/[^a-z0-9]/g, "");
      if (bc.includes(clean) || bcAlpha.includes(cleanAlpha)) return true;

      const sku = (unit.productVariant?.sku || "").toLowerCase();
      const skuAlpha = sku.replace(/[^a-z0-9]/g, "");
      if (sku.includes(clean) || skuAlpha.includes(cleanAlpha)) return true;

      const pName = (unit.productVariant?.product?.name || "").toLowerCase();
      if (pName.includes(clean)) return true;

      const serialStr = String(unit.serialNumber || "");
      if (serialStr === clean || `unit #${serialStr}`.includes(clean)) return true;

      // Match linked order reference
      const linkedOrderNumber = (unit.orderItems?.[0]?.order?.orderNumber || "").toLowerCase();
      if (linkedOrderNumber && linkedOrderNumber.includes(clean)) return true;

      return false;
    });
  }, [unitBarcodes, statusFilter, search]);

  // Reset page to 1 if filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const paginatedUnits = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredBarcodes.slice(startIndex, startIndex + pageSize);
  }, [filteredBarcodes, currentPage, pageSize]);

  const handlePrint = (unit: any) => {
    setSelectedUnit(unit);
    setIsPrintOpen(true);
  };

  return (
    <div className="space-y-6 py-2">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#cce7ed] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0b252c] flex items-center gap-2.5">
            <ScanBarcode className="w-6 h-6 text-[#056468]" />
            <span>Unit Barcode Series Registry</span>
          </h1>
          <p className="text-xs text-[#4a6870] font-normal mt-1">
            Track, filter, and print unique 12-digit Code 128 barcodes assigned to individual inventory units.
          </p>
        </div>
      </div>

      {/* Interactive Metric Cards - Clickable Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <button
          type="button"
          onClick={() => setStatusFilter("ALL")}
          className={`text-left rounded-xl p-5 shadow-md border transition-all cursor-pointer ${
            statusFilter === "ALL"
              ? "bg-[#056468] text-white border-white ring-4 ring-[#056468]/30 scale-[1.02]"
              : "bg-[#056468]/90 text-white/90 border-[#044e51] hover:bg-[#056468]"
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-emerald-200">
            <Layers className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <div className="text-xs font-normal text-emerald-100/80">Total Serial Barcodes</div>
            <div className="text-2xl font-bold text-white mt-0.5">{stats.totalCount}</div>
          </div>
          <div className="text-[11px] text-emerald-200 font-medium flex items-center justify-between mt-1">
            <span>Sequential Code 128 Engine</span>
            {statusFilter === "ALL" && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-bold">Active</span>}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("AVAILABLE")}
          className={`text-left rounded-xl p-5 shadow-md border transition-all cursor-pointer ${
            statusFilter === "AVAILABLE"
              ? "bg-[#056468] text-white border-white ring-4 ring-[#056468]/30 scale-[1.02]"
              : "bg-[#056468]/90 text-white/90 border-[#044e51] hover:bg-[#056468]"
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-emerald-200">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <div className="text-xs font-normal text-emerald-100/80">Available Units in Stock</div>
            <div className="text-2xl font-bold text-emerald-200 mt-0.5">{stats.availableCount}</div>
          </div>
          <div className="text-[11px] text-emerald-100/70 font-medium flex items-center justify-between mt-1">
            <span>Ready for POS Scan & Order</span>
            {statusFilter === "AVAILABLE" && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-bold">Active</span>}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("SOLD")}
          className={`text-left rounded-xl p-5 shadow-md border transition-all cursor-pointer ${
            statusFilter === "SOLD"
              ? "bg-[#056468] text-white border-white ring-4 ring-[#056468]/30 scale-[1.02]"
              : "bg-[#056468]/90 text-white/90 border-[#044e51] hover:bg-[#056468]"
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-emerald-200">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <div className="text-xs font-normal text-emerald-100/80">Sold / Fulfilled Units</div>
            <div className="text-2xl font-bold text-white mt-0.5">{stats.soldCount}</div>
          </div>
          <div className="text-[11px] text-emerald-100/70 font-medium flex items-center justify-between mt-1">
            <span>Completed Customer Orders</span>
            {statusFilter === "SOLD" && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-bold">Active</span>}
          </div>
        </button>
      </div>

      {/* Live Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#cce7ed] shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5f818b]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Live search by 12-digit barcode string, SKU code, product name, or Order #..."
            className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-lg pl-9 pr-9 py-2 text-xs text-[#0b252c] placeholder-[#6a8c96] focus:outline-none focus:ring-2 focus:ring-[#056468]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#f8fcfe] border border-[#cce7ed] rounded-lg px-3 py-2 text-xs text-[#0b252c] font-bold focus:outline-none focus:ring-2 focus:ring-[#056468] cursor-pointer"
          >
            <option value="ALL">All Statuses ({unitBarcodes.length})</option>
            <option value="AVAILABLE">Available in Stock ({stats.availableCount})</option>
            <option value="SOLD">Sold / Scanned Only ({stats.soldCount})</option>
            <option value="RETIRED">Retired Only</option>
          </select>

          {statusFilter !== "ALL" && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter("ALL");
                setSearch("");
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Barcodes Registry Table */}
      <div className="bg-white border border-[#cce7ed] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#cce7ed] pb-3">
          <div>
            <h2 className="text-sm font-bold text-[#0b252c]">
              Registered Units ({filteredBarcodes.length})
            </h2>
            <p className="text-[11px] text-slate-500">
              Showing {statusFilter === "ALL" ? "all barcode series" : statusFilter === "AVAILABLE" ? "available units" : "sold units"}
            </p>
          </div>
          {search && (
            <span className="text-xs text-[#056468] font-semibold bg-[#e3f2f5] px-2.5 py-1 rounded-lg">
              Filtered for &ldquo;{search}&rdquo;
            </span>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-[#cce7ed]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f0f8fa] text-[#0b252c] font-bold uppercase tracking-wider text-[10px] border-b border-[#cce7ed]">
              <tr>
                <th className="p-3">Barcode String</th>
                <th className="p-3">Visual Code 128</th>
                <th className="p-3">Product Name</th>
                <th className="p-3">SKU</th>
                <th className="p-3">Unit Serial #</th>
                <th className="p-3">Status / Order Ref</th>
                <th className="p-3 text-right">Thermal Label</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#cce7ed] text-[#0b252c] font-normal">
              {paginatedUnits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#5f818b]">
                    <ScanBarcode className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-bold text-slate-700">No unit barcodes found matching filters.</p>
                    <p className="text-xs text-slate-500 mt-0.5">Try selecting &ldquo;All Statuses&rdquo; or clearing search keywords.</p>
                  </td>
                </tr>
              ) : (
                paginatedUnits.map((unit: any) => {
                  const linkedOrder = unit.orderItems?.[0]?.order;
                  return (
                    <tr key={unit.id} className="hover:bg-[#f8fcfe] transition-colors">
                      <td className="p-3 font-mono font-bold text-[#0b252c] tracking-wider">
                        {unit.barcode}
                      </td>
                      <td className="p-3">
                        <div className="bg-white p-1 rounded border border-[#cce7ed] inline-block shadow-xs">
                          <BarcodeSvg barcode={unit.barcode} height={22} width={1.2} fontSize={8} />
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-[#0b252c]">
                        {unit.productVariant?.product?.name || "Product Item"}
                      </td>
                      <td className="p-3 text-[#5f818b] font-mono text-[11px] font-semibold">
                        {unit.productVariant?.sku || "SKU"}
                      </td>
                      <td className="p-3 text-[#056468] font-bold">Unit #{unit.serialNumber}</td>
                      <td className="p-3">
                        <div className="space-y-0.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-block ${
                              unit.status === "AVAILABLE"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : unit.status === "SOLD"
                                ? "bg-purple-100 text-purple-800 border border-purple-300"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {unit.status}
                          </span>
                          {unit.status === "SOLD" && linkedOrder && (
                            <div className="text-[10px] font-mono text-slate-600">
                              Order: <strong className="text-slate-900">{linkedOrder.orderNumber}</strong>
                              {linkedOrder.customerName && (
                                <span className="block text-[9px] text-slate-500 font-sans">{linkedOrder.customerName}</span>
                              )}
                            </div>
                          )}
                          {unit.soldAt && (
                            <div className="text-[9px] text-slate-400">
                              {new Date(unit.soldAt).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handlePrint(unit)}
                          className="px-3 py-1.5 bg-[#056468] hover:bg-[#044e51] text-white font-bold text-[11px] rounded-lg shadow-xs transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Print</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer Controls */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredBarcodes.length}
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
          productName={selectedUnit.productVariant?.product?.name || "Product Item"}
          sku={selectedUnit.productVariant?.sku || "SKU"}
          price={
            selectedUnit.productVariant?.sellingPrice ||
            selectedUnit.productVariant?.product?.offerPrice || 0
          }
          barcode={selectedUnit.barcode}
          serialNumber={selectedUnit.serialNumber}
        />
      )}
    </div>
  );
}

