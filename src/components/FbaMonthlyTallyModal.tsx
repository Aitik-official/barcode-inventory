"use client";

import { useState, useEffect } from "react";
import {
  X,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Search,
  Download,
  CheckSquare,
  Square,
  Package,
  Layers,
  ArrowRight,
  Plus,
} from "lucide-react";

interface FbaItem {
  id: string;
  barcode: string;
  serialNumber: number;
  productVariantId: string;
  sku: string;
  productName: string;
  sellingPrice: number;
  status: "KEPT_AT_FBA" | "ORDERED_DELIVERED" | "DAMAGED" | "RETURNED_TO_WAREHOUSE";
  tallyMonth?: string | null;
  tallyDate?: string | null;
  tallyBy?: string | null;
  tallyNotes?: string | null;
  channelOrderId?: string | null;
  createdAt: string;
  fbaTransfer: {
    id: string;
    shipmentNumber: string;
    channel: string;
    destinationFc?: string | null;
    status: string;
    createdAt: string;
  };
}

interface FbaMonthlyTallyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTransferModal?: () => void;
}

export function FbaMonthlyTallyModal({
  isOpen,
  onClose,
  onOpenTransferModal,
}: FbaMonthlyTallyModalProps) {
  const [items, setItems] = useState<FbaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filters
  const [availableDivisions, setAvailableDivisions] = useState<string[]>(["Amazon", "Flipkart"]);
  const [activeDivision, setActiveDivision] = useState<string>("ALL");
  const [activeStatus, setActiveStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Stats
  const [stats, setStats] = useState({
    totalTransferred: 0,
    currentlyKeptAtFba: 0,
    orderedDelivered: 0,
    damaged: 0,
    returnedToWarehouse: 0,
    totalStockValueKept: 0,
    totalSalesValue: 0,
  });

  // Selected for batch action
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeDivision && activeDivision !== "ALL") params.set("division", activeDivision);
      if (activeStatus && activeStatus !== "ALL") params.set("status", activeStatus);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/fba/tally?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load FBA units.");
      }

      setItems(data.items || []);
      if (data.stats) setStats(data.stats);
      if (Array.isArray(data.availableDivisions) && data.availableDivisions.length > 0) {
        setAvailableDivisions(data.availableDivisions);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
      setSelectedIds([]);
    }
  }, [isOpen, activeDivision, activeStatus]);

  if (!isOpen) return null;

  // Single-item or Batch 1-Click Status Updater
  const handleUpdateStatus = async (
    targetIds: string[],
    targetStatus: "ORDERED_DELIVERED" | "RETURNED_TO_WAREHOUSE" | "KEPT_AT_FBA"
  ) => {
    if (targetIds.length === 0) return;

    setIsUpdating(true);
    setError(null);
    setActionSuccess(null);

    try {
      const res = await fetch("/api/fba/tally", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SET_STATUS",
          targetStatus,
          itemIds: targetIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status.");

      setActionSuccess(data.message);
      setSelectedIds((prev) => prev.filter((id) => !targetIds.includes(id)));
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items.map((i) => i.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleExportCsv = () => {
    if (items.length === 0) return;

    const headers = [
      "Sr No",
      "Unit Barcode",
      "Unit Serial",
      "Product Name",
      "SKU",
      "Division",
      "Status",
      "Tally Month",
      "Selling Price",
      "Date",
    ];

    const rows = items.map((item, idx) => [
      idx + 1,
      item.barcode,
      item.serialNumber,
      `"${item.productName.replace(/"/g, '""')}"`,
      `"${item.sku.replace(/"/g, '""')}"`,
      item.fbaTransfer?.channel || "Amazon",
      item.status === "KEPT_AT_FBA"
        ? "Kept Idle"
        : item.status === "ORDERED_DELIVERED"
        ? "Order Delivered"
        : item.status === "RETURNED_TO_WAREHOUSE"
        ? "Returned"
        : item.status,
      item.tallyMonth || "-",
      item.sellingPrice || 0,
      item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fba_units_${activeDivision.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-[#cce7ed] rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-[#0b252c] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-500/30">
              <ClipboardList className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">
                FBA Units & Status Manager
              </h3>
              <p className="text-xs text-slate-300">
                1-click mark units as <strong>Order Delivered</strong>, <strong>Returned</strong>, or <strong>Kept Idle</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenTransferModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTransferModal();
                }}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Scan Bulk Units</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Division Selection Pills */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 mr-1">Division:</span>
            <button
              type="button"
              onClick={() => setActiveDivision("ALL")}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                activeDivision === "ALL"
                  ? "bg-[#056468] text-white border-[#056468] shadow-xs"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
              }`}
            >
              All Divisions
            </button>
            {availableDivisions.map((div) => {
              const isSelected = activeDivision.toLowerCase() === div.toLowerCase();
              return (
                <button
                  key={div}
                  type="button"
                  onClick={() => setActiveDivision(div)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#056468] text-white border-[#056468] shadow-xs"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {div}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Status Filter Chips & Search */}
        <div className="px-6 py-2.5 border-b border-slate-200 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActiveStatus("ALL")}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                activeStatus === "ALL"
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
              }`}
            >
              All ({stats.totalTransferred})
            </button>

            <button
              type="button"
              onClick={() => setActiveStatus("KEPT_AT_FBA")}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                activeStatus === "KEPT_AT_FBA"
                  ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                  : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Kept Idle ({stats.currentlyKeptAtFba})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStatus("ORDERED_DELIVERED")}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                activeStatus === "ORDERED_DELIVERED"
                  ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                  : "bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Order Delivered ({stats.orderedDelivered})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStatus("RETURNED_TO_WAREHOUSE")}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                activeStatus === "RETURNED_TO_WAREHOUSE"
                  ? "bg-rose-600 text-white border-rose-700 shadow-xs"
                  : "bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100"
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Returned ({stats.returnedToWarehouse})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchData()}
              placeholder="Search barcode, SKU..."
              className="text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg w-full sm:w-56 focus:outline-none focus:border-[#056468]"
            />
          </div>
        </div>

        {/* Batch Action Bar */}
        {selectedIds.length > 0 && (
          <div className="bg-amber-50 border-b border-amber-300 px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">
                {selectedIds.length}
              </span>
              <span>Unit(s) selected:</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleUpdateStatus(selectedIds, "ORDERED_DELIVERED")}
                disabled={isUpdating}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1 cursor-pointer transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark Delivered</span>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateStatus(selectedIds, "RETURNED_TO_WAREHOUSE")}
                disabled={isUpdating}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1 cursor-pointer transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Mark Returned</span>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateStatus(selectedIds, "KEPT_AT_FBA")}
                disabled={isUpdating}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1 cursor-pointer transition-all"
              >
                <span>Set Kept Idle</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800"
              >
                Deselect
              </button>
            </div>
          </div>
        )}

        {/* Alerts */}
        {actionSuccess && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2 text-xs font-bold text-emerald-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {actionSuccess}
            </span>
            <button onClick={() => setActionSuccess(null)} className="text-emerald-700">✕</button>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-2 text-xs font-bold text-rose-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              {error}
            </span>
            <button onClick={() => setError(null)} className="text-rose-700">✕</button>
          </div>
        )}

        {/* Units Table */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500">
              <div className="w-8 h-8 border-2 border-[#056468] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Loading FBA units...
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-700">No FBA Units Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No units match {activeDivision !== "ALL" ? `division "${activeDivision}"` : "the selected filters"}.
              </p>
              {onOpenTransferModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenTransferModal();
                  }}
                  className="px-4 py-2 bg-[#056468] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  + Scan Bulk Units to FBA
                </button>
              )}
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3 w-10 text-center">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="text-slate-600 cursor-pointer"
                      >
                        {selectedIds.length === items.length && items.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-[#056468]" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </th>
                    <th className="p-3">Unit Barcode</th>
                    <th className="p-3">Product Name & SKU</th>
                    <th className="p-3">Division</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Price</th>
                    <th className="p-3 text-right">1-Click Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSelected ? "bg-amber-50/50" : ""
                        }`}
                      >
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleSelectItem(item.id)}
                            className="cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#056468]" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </button>
                        </td>

                        {/* Barcode & Serial */}
                        <td className="p-3 font-mono">
                          <div className="font-bold text-[#056468]">{item.barcode}</div>
                          <div className="text-[10px] text-slate-400">Unit #{item.serialNumber}</div>
                        </td>

                        {/* Product & SKU */}
                        <td className="p-3">
                          <div className="font-bold text-[#0b252c] max-w-xs truncate" title={item.productName}>
                            {item.productName}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500">
                            SKU: {item.sku}
                          </div>
                        </td>

                        {/* Division */}
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {item.fbaTransfer?.channel || "Amazon"}
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="p-3">
                          {item.status === "KEPT_AT_FBA" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              Kept Idle
                            </span>
                          )}
                          {item.status === "ORDERED_DELIVERED" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Order Delivered
                            </span>
                          )}
                          {item.status === "RETURNED_TO_WAREHOUSE" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                              <RotateCcw className="w-3 h-3 text-rose-600" />
                              Returned
                            </span>
                          )}
                          {item.status === "DAMAGED" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800">
                              Damaged
                            </span>
                          )}
                        </td>

                        {/* Price */}
                        <td className="p-3 text-right font-mono font-bold text-slate-800">
                          ₹{item.sellingPrice.toFixed(2)}
                        </td>

                        {/* 1-Click Action Buttons */}
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.status !== "ORDERED_DELIVERED" && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus([item.id], "ORDERED_DELIVERED")}
                                disabled={isUpdating}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md text-[11px] font-bold transition-all cursor-pointer"
                                title="Mark this unit as Order Delivered"
                              >
                                Delivered
                              </button>
                            )}

                            {item.status !== "RETURNED_TO_WAREHOUSE" && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus([item.id], "RETURNED_TO_WAREHOUSE")}
                                disabled={isUpdating}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-md text-[11px] font-bold transition-all cursor-pointer"
                                title="Mark as Returned (restores to shop stock)"
                              >
                                Return
                              </button>
                            )}

                            {item.status !== "KEPT_AT_FBA" && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus([item.id], "KEPT_AT_FBA")}
                                disabled={isUpdating}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-md text-[11px] font-bold transition-all cursor-pointer"
                                title="Mark back as Kept Idle in FBA stock"
                              >
                                Idle
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Total: <strong>{items.length}</strong> units •{" "}
            <span className="text-amber-800 font-bold">{stats.currentlyKeptAtFba} Kept Idle</span> •{" "}
            <span className="text-emerald-700 font-bold">{stats.orderedDelivered} Delivered</span> •{" "}
            <span className="text-rose-700 font-bold">{stats.returnedToWarehouse} Returned</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
