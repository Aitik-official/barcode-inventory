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
  AlertTriangle,
  Trash2,
  RotateCcw,
  AlertCircle,
  Check,
  ShieldAlert,
} from "lucide-react";

import { getSessionCache, setSessionCache, invalidateSessionCache } from "@/lib/sessionCache";
import { runProgressiveParallelBatches } from "@/lib/progressiveBatchFetch";

const DEFECT_REASONS = [
  "Broken / Physical or Housing Damage",
  "Hardware / Electronic Component Defect",
  "Display / Touchscreen Malfunction",
  "Quality Check / Calibration Failure",
  "Packaging Crushed / Transit Damage",
  "Customer Return - Faulty Piece",
  "Other",
];

export default function UnitBarcodesClient({
  unitBarcodes = [],
  stats = { totalCount: 0, availableCount: 0, soldCount: 0, damagedCount: 0 },
  initialSearch = "",
  initialStatus = "ALL",
}: {
  unitBarcodes: any[];
  stats: { totalCount: number; availableCount: number; soldCount: number; damagedCount?: number };
  initialSearch: string;
  initialStatus: string;
}) {
  const [selectedUnit, setSelectedUnit] = useState<any>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  // Defective piece & delete modal states
  const [defectiveModalUnit, setDefectiveModalUnit] = useState<any | null>(null);
  const [defectReason, setDefectReason] = useState<string>(DEFECT_REASONS[0]);
  const [customDefectReason, setCustomDefectReason] = useState<string>("");
  const [deleteModalUnit, setDeleteModalUnit] = useState<any | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Local state with instant browser session cache
  const [localBarcodes, setLocalBarcodes] = useState<any[]>(() => {
    const cached = getSessionCache("unit_barcodes_list");
    if (cached && cached.length > 0) return cached;
    if (unitBarcodes && unitBarcodes.length > 0) return unitBarcodes;
    return [];
  });

  const [localStats, setLocalStats] = useState(() => {
    if (stats && stats.totalCount > 0) return stats;
    return getSessionCache("unit_barcodes_stats") || stats;
  });

  useEffect(() => {
    if (unitBarcodes && unitBarcodes.length > 0) {
      setLocalBarcodes((prev) => {
        if (prev.length > unitBarcodes.length) {
          const map = new Map(prev.map((u) => [u.id || u.barcode, u]));
          unitBarcodes.forEach((u) => map.set(u.id || u.barcode, { ...map.get(u.id || u.barcode), ...u }));
          const merged = Array.from(map.values());
          setSessionCache("unit_barcodes_list", merged);
          return merged;
        }
        setSessionCache("unit_barcodes_list", unitBarcodes);
        return unitBarcodes;
      });
    }
  }, [unitBarcodes]);

  useEffect(() => {
    if (stats && stats.totalCount > 0) {
      setLocalStats(stats);
      setSessionCache("unit_barcodes_stats", stats);
    }
  }, [stats]);

  // Filter state
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus || "ALL");

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Filter unitBarcodes dynamically
  const filteredBarcodes = useMemo(() => {
    return localBarcodes.filter((unit) => {
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
  }, [localBarcodes, statusFilter, search]);

  // Progressive background batch fetching (2 parallel batches of 25 barcodes)
  useEffect(() => {
    const cacheKey = `barcodes_batches_complete_${initialSearch || ""}_${initialStatus || ""}`;
    const queryParams = new URLSearchParams();
    if (initialSearch) queryParams.set("search", initialSearch);
    if (initialStatus && initialStatus !== "ALL") queryParams.set("status", initialStatus);
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/api/barcodes?${queryString}` : "/api/barcodes";

    runProgressiveParallelBatches<any>({
      endpoint,
      startPage: 2,
      pageSize: 25,
      cacheCompletedKey: cacheKey,
      onBatch: (newUnits: any[]) => {
        if (newUnits.length > 0) {
          setLocalBarcodes((prev) => {
            const map = new Map(prev.map((u) => [u.id || u.barcode, u]));
            newUnits.forEach((u) => map.set(u.id || u.barcode, u));
            const merged = Array.from(map.values());
            setSessionCache("unit_barcodes_list", merged);
            return merged;
          });
        }
      },
    });
  }, [initialSearch, initialStatus]);

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

  // Shift unit barcode to DEFECTIVE / DAMAGED piece
  const handleShiftToDefective = async () => {
    if (!defectiveModalUnit) return;
    setIsActionLoading(true);
    const finalReason = defectReason === "Other" ? (customDefectReason.trim() || "Defective piece") : defectReason;

    try {
      const res = await fetch("/api/barcodes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: defectiveModalUnit.id,
          status: "DAMAGED",
          reason: finalReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to shift barcode to defective piece");

      const wasAvailable = defectiveModalUnit.status === "AVAILABLE";
      setLocalBarcodes((prev) => {
        const updated = prev.map((u) =>
          u.id === defectiveModalUnit.id
            ? { ...u, status: "DAMAGED", reason: finalReason }
            : u
        );
        setSessionCache("unit_barcodes_list", updated);
        return updated;
      });

      setLocalStats((prev: any) => {
        const nextStats = {
          ...prev,
          availableCount: wasAvailable ? Math.max(0, prev.availableCount - 1) : prev.availableCount,
          damagedCount: (prev.damagedCount || 0) + 1,
        };
        setSessionCache("unit_barcodes_stats", nextStats);
        return nextStats;
      });

      invalidateSessionCache("inventory_");
      setFeedbackMsg({
        type: "success",
        text: `Barcode ${defectiveModalUnit.barcode} shifted to Defective / Damaged Piece successfully!`,
      });
      setDefectiveModalUnit(null);
      setCustomDefectReason("");
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message || "Failed to update barcode." });
    } finally {
      setIsActionLoading(false);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  // Restore barcode back to AVAILABLE stock
  const handleRestoreToAvailable = async (unit: any) => {
    if (!confirm(`Restore barcode ${unit.barcode} back to AVAILABLE stock?`)) return;
    setIsActionLoading(true);
    try {
      const res = await fetch("/api/barcodes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: unit.id,
          status: "AVAILABLE",
          reason: null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to restore barcode");

      const wasDamaged = unit.status === "DAMAGED";
      setLocalBarcodes((prev) => {
        const updated = prev.map((u) =>
          u.id === unit.id ? { ...u, status: "AVAILABLE", reason: null } : u
        );
        setSessionCache("unit_barcodes_list", updated);
        return updated;
      });

      setLocalStats((prev: any) => {
        const nextStats = {
          ...prev,
          availableCount: prev.availableCount + 1,
          damagedCount: wasDamaged ? Math.max(0, (prev.damagedCount || 1) - 1) : prev.damagedCount,
        };
        setSessionCache("unit_barcodes_stats", nextStats);
        return nextStats;
      });

      invalidateSessionCache("inventory_");
      setFeedbackMsg({
        type: "success",
        text: `Barcode ${unit.barcode} restored to AVAILABLE stock!`,
      });
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message });
    } finally {
      setIsActionLoading(false);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  // Permanently delete barcode
  const handleDeleteBarcode = async () => {
    if (!deleteModalUnit) return;
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/barcodes?id=${deleteModalUnit.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete barcode");

      const wasAvailable = deleteModalUnit.status === "AVAILABLE";
      const wasDamaged = deleteModalUnit.status === "DAMAGED";

      setLocalBarcodes((prev) => {
        const updated = prev.filter((u) => u.id !== deleteModalUnit.id);
        setSessionCache("unit_barcodes_list", updated);
        return updated;
      });

      setLocalStats((prev: any) => {
        const nextStats = {
          ...prev,
          totalCount: Math.max(0, prev.totalCount - 1),
          availableCount: wasAvailable ? Math.max(0, prev.availableCount - 1) : prev.availableCount,
          damagedCount: wasDamaged ? Math.max(0, (prev.damagedCount || 1) - 1) : prev.damagedCount,
        };
        setSessionCache("unit_barcodes_stats", nextStats);
        return nextStats;
      });

      invalidateSessionCache("inventory_");
      setFeedbackMsg({
        type: "success",
        text: `Barcode ${deleteModalUnit.barcode} permanently deleted and serial released.`,
      });
      setDeleteModalUnit(null);
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message || "Failed to delete barcode." });
    } finally {
      setIsActionLoading(false);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  return (
    <div className="space-y-6 py-2">
      {/* Toast Notification */}
      {feedbackMsg && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in slide-in-from-top-2 ${
            feedbackMsg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
              : "bg-rose-50 text-rose-800 border-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === "success" ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="p-1 hover:bg-black/5 rounded-md"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#cce7ed] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0b252c] flex items-center gap-2.5">
            <ScanBarcode className="w-6 h-6 text-[#056468]" />
            <span>Unit Barcode Series Registry</span>
          </h1>
          <p className="text-xs text-[#4a6870] font-normal mt-1">
            Track, filter, delete, or shift barcodes to defective pieces. Print thermal labels on demand.
          </p>
        </div>
      </div>

      {/* Interactive Metric Cards - 4 Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setStatusFilter("ALL")}
          className={`text-left rounded-xl p-4 sm:p-5 shadow-md border transition-all cursor-pointer ${
            statusFilter === "ALL"
              ? "bg-[#056468] text-white border-white ring-4 ring-[#056468]/30 scale-[1.02]"
              : "bg-[#056468]/90 text-white/90 border-[#044e51] hover:bg-[#056468]"
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-emerald-200">
            <Layers className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <div className="text-xs font-normal text-emerald-100/80">Total Barcodes</div>
            <div className="text-2xl font-bold text-white mt-0.5">{localStats.totalCount}</div>
          </div>
          <div className="text-[11px] text-emerald-200 font-medium flex items-center justify-between mt-1">
            <span>Code 128 Engine</span>
            {statusFilter === "ALL" && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-bold">Active</span>}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("AVAILABLE")}
          className={`text-left rounded-xl p-4 sm:p-5 shadow-md border transition-all cursor-pointer ${
            statusFilter === "AVAILABLE"
              ? "bg-[#056468] text-white border-white ring-4 ring-[#056468]/30 scale-[1.02]"
              : "bg-[#056468]/90 text-white/90 border-[#044e51] hover:bg-[#056468]"
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-emerald-200">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <div className="text-xs font-normal text-emerald-100/80">Available in Stock</div>
            <div className="text-2xl font-bold text-emerald-200 mt-0.5">{localStats.availableCount}</div>
          </div>
          <div className="text-[11px] text-emerald-100/70 font-medium flex items-center justify-between mt-1">
            <span>Ready for Dispatch</span>
            {statusFilter === "AVAILABLE" && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-bold">Active</span>}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("SOLD")}
          className={`text-left rounded-xl p-4 sm:p-5 shadow-md border transition-all cursor-pointer ${
            statusFilter === "SOLD"
              ? "bg-[#056468] text-white border-white ring-4 ring-[#056468]/30 scale-[1.02]"
              : "bg-[#056468]/90 text-white/90 border-[#044e51] hover:bg-[#056468]"
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-emerald-200">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <div className="text-xs font-normal text-emerald-100/80">Sold / Fulfilled</div>
            <div className="text-2xl font-bold text-white mt-0.5">{localStats.soldCount}</div>
          </div>
          <div className="text-[11px] text-emerald-100/70 font-medium flex items-center justify-between mt-1">
            <span>Completed Orders</span>
            {statusFilter === "SOLD" && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-bold">Active</span>}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("DAMAGED")}
          className={`text-left rounded-xl p-4 sm:p-5 shadow-md border transition-all cursor-pointer ${
            statusFilter === "DAMAGED"
              ? "bg-amber-700 text-white border-white ring-4 ring-amber-700/30 scale-[1.02]"
              : "bg-white text-slate-800 border-amber-200 hover:border-amber-400"
          }`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${statusFilter === "DAMAGED" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-700"}`}>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="mt-2">
            <div className={`text-xs font-normal ${statusFilter === "DAMAGED" ? "text-amber-100" : "text-slate-500"}`}>Defective Pieces</div>
            <div className={`text-2xl font-bold mt-0.5 ${statusFilter === "DAMAGED" ? "text-white" : "text-amber-700"}`}>
              {localStats.damagedCount || 0}
            </div>
          </div>
          <div className={`text-[11px] font-medium flex items-center justify-between mt-1 ${statusFilter === "DAMAGED" ? "text-amber-100" : "text-amber-700"}`}>
            <span>Faulty & Write-offs</span>
            {statusFilter === "DAMAGED" && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-bold">Active</span>}
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
            <option value="ALL">All Statuses ({localBarcodes.length})</option>
            <option value="AVAILABLE">Available in Stock ({localStats.availableCount})</option>
            <option value="DAMAGED">Defective / Damaged ({localStats.damagedCount || 0})</option>
            <option value="SOLD">Sold / Scanned Only ({localStats.soldCount})</option>
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
                          {unit.status === "DAMAGED" ? (
                            <div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-300">
                                <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                                <span>DEFECTIVE PIECE</span>
                              </span>
                              {unit.reason && (
                                <p className="text-[10px] text-amber-900 font-medium italic mt-0.5 max-w-xs truncate" title={unit.reason}>
                                  Reason: {unit.reason}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-block ${
                                unit.status === "AVAILABLE"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : unit.status === "SOLD" && linkedOrder
                                  ? "bg-purple-100 text-purple-800 border border-purple-300"
                                  : unit.status === "SOLD"
                                  ? "bg-cyan-100 text-cyan-900 border border-cyan-300"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {unit.status === "AVAILABLE"
                                ? "AVAILABLE"
                                : unit.status === "SOLD" && linkedOrder
                                ? "SOLD"
                                : "SCANNED"}
                            </span>
                          )}
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
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handlePrint(unit)}
                            title="Print Thermal Label"
                            className="p-1.5 sm:px-2.5 sm:py-1.5 bg-[#056468] hover:bg-[#044e51] text-white font-bold text-[11px] rounded-lg shadow-xs transition-all inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Print</span>
                          </button>

                          {unit.status === "AVAILABLE" && (
                            <button
                              onClick={() => {
                                setDefectiveModalUnit(unit);
                                setDefectReason(DEFECT_REASONS[0]);
                                setCustomDefectReason("");
                              }}
                              title="Shift to Defective Piece"
                              className="p-1.5 sm:px-2.5 sm:py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[11px] rounded-lg shadow-xs transition-all inline-flex items-center gap-1 cursor-pointer"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              <span className="hidden sm:inline">Defective</span>
                            </button>
                          )}

                          {unit.status === "DAMAGED" && (
                            <button
                              onClick={() => handleRestoreToAvailable(unit)}
                              title="Restore to Available Stock"
                              className="p-1.5 sm:px-2.5 sm:py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px] rounded-lg shadow-xs transition-all inline-flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="hidden sm:inline">Restore</span>
                            </button>
                          )}

                          <button
                            onClick={() => setDeleteModalUnit(unit)}
                            title="Delete Barcode"
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 border border-rose-200 rounded-lg shadow-xs transition-all inline-flex items-center cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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

      {/* Shift to Defective Piece Modal */}
      {defectiveModalUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-amber-200 space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-amber-100 pb-3">
              <div className="flex items-center gap-2.5 text-amber-800">
                <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Shift to Defective Piece</h3>
                  <p className="text-xs text-slate-500">Record unit as faulty / write-off in inventory & waste ledger</p>
                </div>
              </div>
              <button
                onClick={() => setDefectiveModalUnit(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Unit Details Preview */}
            <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Barcode String:</span>
                <span className="font-mono font-bold text-slate-900 tracking-wider text-sm">{defectiveModalUnit.barcode}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Product Item:</span>
                <span className="font-semibold text-slate-800 text-xs">{defectiveModalUnit.productVariant?.product?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">SKU / Serial #:</span>
                <span className="font-mono text-xs text-slate-700">{defectiveModalUnit.productVariant?.sku} · Unit #{defectiveModalUnit.serialNumber}</span>
              </div>
            </div>

            {/* Defect Reason Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>Select Defect / Damage Reason:</span>
                <span className="text-rose-500">*</span>
              </label>
              <select
                value={defectReason}
                onChange={(e) => setDefectReason(e.target.value)}
                className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                {DEFECT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              {defectReason === "Other" && (
                <div className="pt-2">
                  <input
                    type="text"
                    value={customDefectReason}
                    onChange={(e) => setCustomDefectReason(e.target.value)}
                    placeholder="Enter specific defect or damage details..."
                    className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
              ⚠️ <strong>Inventory Effect:</strong> Marking this unit as defective will remove 1 quantity from available stock and log a write-off transaction in the Damaged & Waste audit log.
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDefectiveModalUnit(null)}
                disabled={isActionLoading}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleShiftToDefective}
                disabled={isActionLoading}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isActionLoading ? (
                  <span>Updating...</span>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Confirm Shift to Defective</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Barcode Confirmation Modal */}
      {deleteModalUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-rose-100 pb-3">
              <div className="flex items-center gap-2.5 text-rose-700">
                <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Delete Unit Barcode</h3>
                  <p className="text-xs text-slate-500">Permanently remove this per-unit barcode</p>
                </div>
              </div>
              <button
                onClick={() => setDeleteModalUnit(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete the unit barcode{" "}
              <strong className="font-mono text-slate-900">{deleteModalUnit.barcode}</strong>{" "}
              (Unit #{deleteModalUnit.serialNumber}) for{" "}
              <strong>{deleteModalUnit.productVariant?.product?.name}</strong>?
            </p>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-[11px] text-rose-800 leading-relaxed">
              🚨 If this unit is currently in <strong>AVAILABLE</strong> stock, available warehouse quantity will automatically be reduced by 1 to keep physical inventory in sync.
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteModalUnit(null)}
                disabled={isActionLoading}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteBarcode}
                disabled={isActionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-md transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isActionLoading ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

