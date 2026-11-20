"use client";

import { useState, useEffect, useMemo } from "react";
import {
  X,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Building2,
  Calendar,
  Filter,
  Search,
  Download,
  CheckSquare,
  Square,
  TrendingUp,
  Package,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldAlert,
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

interface SkuSummary {
  sku: string;
  productName: string;
  total: number;
  kept: number;
  sold: number;
  damaged: number;
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
  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [availableMonths, setAvailableMonths] = useState<string[]>([currentMonthStr]);
  const [channelFilter, setChannelFilter] = useState<string>("ALL");
  const [statusTab, setStatusTab] = useState<
    "KEPT_AT_FBA" | "ORDERED_DELIVERED" | "ALL" | "DAMAGED" | "RETURNED_TO_WAREHOUSE"
  >("KEPT_AT_FBA");
  const [searchQuery, setSearchQuery] = useState("");

  // Stats & SKU Breakdown
  const [stats, setStats] = useState({
    totalTransferred: 0,
    currentlyKeptAtFba: 0,
    orderedDelivered: 0,
    damaged: 0,
    returnedToWarehouse: 0,
    totalStockValueKept: 0,
    totalSalesValue: 0,
  });
  const [skuSummary, setSkuSummary] = useState<SkuSummary[]>([]);

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Quick SKU Tally Popover
  const [showQuickSkuTally, setShowQuickSkuTally] = useState(false);
  const [quickSku, setQuickSku] = useState("");
  const [quickQty, setQuickQty] = useState(1);
  const [quickNotes, setQuickNotes] = useState("");

  // Reconcile Drawer / Modal prompt
  const [showReconcilePrompt, setShowReconcilePrompt] = useState(false);
  const [reconcileNotes, setReconcileNotes] = useState("");
  const [channelOrderIdInput, setChannelOrderIdInput] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedMonth && selectedMonth !== "ALL") params.set("month", selectedMonth);
      if (channelFilter && channelFilter !== "ALL") params.set("channel", channelFilter);
      if (statusTab && statusTab !== "ALL") params.set("status", statusTab);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/fba/tally?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load FBA tally data.");
      }

      setItems(data.items || []);
      if (data.stats) setStats(data.stats);
      if (data.availableMonths) setAvailableMonths(data.availableMonths);
      if (data.skuSummary) {
        setSkuSummary(data.skuSummary);
        if (!quickSku && data.skuSummary.length > 0) {
          const firstKept = data.skuSummary.find((s: SkuSummary) => s.kept > 0);
          if (firstKept) setQuickSku(firstKept.sku);
        }
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
  }, [isOpen, selectedMonth, channelFilter, statusTab]);

  if (!isOpen) return null;

  // Filtered view in table
  const displayedItems = items;

  const toggleSelectAll = () => {
    if (selectedIds.length === displayedItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayedItems.map((i) => i.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBatchMarkDelivered = async () => {
    if (selectedIds.length === 0) return;

    setIsSubmittingAction(true);
    setError(null);
    setActionSuccess(null);

    try {
      const res = await fetch("/api/fba/tally", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "MARK_ORDERED_DELIVERED",
          itemIds: selectedIds,
          tallyMonth: selectedMonth !== "ALL" ? selectedMonth : currentMonthStr,
          notes: reconcileNotes || "FBA Monthly Sales Tally",
          channelOrderId: channelOrderIdInput || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to mark delivered.");

      setActionSuccess(data.message || `Marked ${selectedIds.length} units as delivered & sold.`);
      setSelectedIds([]);
      setShowReconcilePrompt(false);
      setReconcileNotes("");
      setChannelOrderIdInput("");
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleQuickSkuTallySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSku || quickQty <= 0) return;

    setIsSubmittingAction(true);
    setError(null);
    setActionSuccess(null);

    try {
      const res = await fetch("/api/fba/tally", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "MARK_ORDERED_DELIVERED",
          sku: quickSku,
          quantity: Number(quickQty),
          tallyMonth: selectedMonth !== "ALL" ? selectedMonth : currentMonthStr,
          notes: quickNotes || `Quick SKU Tally: ${quickQty} sold via FBA`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reconcile SKU.");

      setActionSuccess(data.message || `Reconciled ${quickQty} units of SKU ${quickSku}.`);
      setShowQuickSkuTally(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleReturnToWarehouse = async () => {
    if (selectedIds.length === 0) return;
    if (
      !confirm(
        `Are you sure you want to recall ${selectedIds.length} unit(s) from FBA back to main local warehouse inventory?`
      )
    ) {
      return;
    }

    setIsSubmittingAction(true);
    setError(null);

    try {
      const res = await fetch("/api/fba/tally", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RETURN_TO_WAREHOUSE",
          itemIds: selectedIds,
          notes: "Recalled from FBA to local retail stock",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to return units.");

      setActionSuccess(data.message);
      setSelectedIds([]);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleMarkDamaged = async () => {
    if (selectedIds.length === 0) return;
    const reason = prompt("Enter damage / lost reason at FBA FC:", "Lost in Amazon Fulfillment Center");
    if (reason === null) return;

    setIsSubmittingAction(true);
    setError(null);

    try {
      const res = await fetch("/api/fba/tally", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "MARK_DAMAGED",
          itemIds: selectedIds,
          notes: reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to mark damaged.");

      setActionSuccess(data.message);
      setSelectedIds([]);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleRevertToKept = async (itemId: string) => {
    if (!confirm("Revert this unit back to sitting 'Kept at FBA' stock?")) return;

    try {
      const res = await fetch("/api/fba/tally", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REVERT_TO_KEPT",
          itemIds: [itemId],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revert.");
      setActionSuccess(data.message);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleExportCsv = () => {
    if (items.length === 0) return;

    const headers = [
      "Sr No",
      "Unit Barcode",
      "Unit Serial",
      "SKU",
      "Product Name",
      "FBA Channel",
      "Destination FC",
      "Shipment Number",
      "Status",
      "Tally Month",
      "Tally Date",
      "Selling Price",
      "Channel Order ID",
      "Tally Notes",
    ];

    const rows = items.map((item, idx) => [
      idx + 1,
      item.barcode,
      item.serialNumber,
      `"${item.sku.replace(/"/g, '""')}"`,
      `"${item.productName.replace(/"/g, '""')}"`,
      item.fbaTransfer?.channel || "AMAZON_FBA",
      `"${(item.fbaTransfer?.destinationFc || "").replace(/"/g, '""')}"`,
      item.fbaTransfer?.shipmentNumber || "",
      item.status,
      item.tallyMonth || "-",
      item.tallyDate ? new Date(item.tallyDate).toLocaleDateString() : "-",
      item.sellingPrice || 0,
      item.channelOrderId || "-",
      `"${(item.tallyNotes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `fba_tally_${selectedMonth}_${channelFilter.toLowerCase()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeSku = skuSummary.find((s) => s.sku === quickSku);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-[#cce7ed] rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-[#0b252c] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-500/30">
              <ClipboardList className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span>FBA Inventory & Monthly Tally System</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-teal-400/20 text-teal-300 border border-teal-400/30">
                  Amazon / Flipkart / 3PL
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Track physical units kept in FBA warehouses and mark them as ordered/delivered during monthly reconciliation.
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
                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold rounded-lg border border-amber-500/40 transition-colors flex items-center gap-1.5"
              >
                <Package className="w-3.5 h-3.5" />
                <span>+ Inward New FBA Batch</span>
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

        {/* Top Summary Cards */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Units Kept at FBA */}
            <div className="bg-white p-3.5 rounded-xl border-2 border-amber-300 shadow-xs">
              <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center justify-between">
                <span>Units Kept at FBA</span>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              </div>
              <div className="text-2xl font-black text-[#0b252c] mt-1">
                {stats.currentlyKeptAtFba}{" "}
                <span className="text-xs font-bold text-slate-500">Units</span>
              </div>
              <div className="text-[11px] text-amber-900 font-mono font-semibold mt-0.5">
                Valuation: ₹{stats.totalStockValueKept.toLocaleString("en-IN")}
              </div>
            </div>

            {/* Ordered & Delivered */}
            <div className="bg-white p-3.5 rounded-xl border border-emerald-300 shadow-xs">
              <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
                <span>Ordered & Delivered</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-800 mt-1">
                {stats.orderedDelivered}{" "}
                <span className="text-xs font-bold text-slate-500">Sold</span>
              </div>
              <div className="text-[11px] text-emerald-900 font-mono font-semibold mt-0.5">
                Reconciled Sales: ₹{stats.totalSalesValue.toLocaleString("en-IN")}
              </div>
            </div>

            {/* Total Inbounded */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                Total Inbounded
              </div>
              <div className="text-2xl font-black text-slate-800 mt-1">
                {stats.totalTransferred}{" "}
                <span className="text-xs font-bold text-slate-500">Units</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Lifetime FBA Transferred
              </div>
            </div>

            {/* Damaged / Recalled */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                Damaged & Recalled
              </div>
              <div className="text-2xl font-black text-slate-800 mt-1 flex items-baseline gap-2">
                <span className="text-rose-700">{stats.damaged} Damaged</span>
                <span className="text-xs text-slate-400">/</span>
                <span className="text-blue-700 text-sm font-bold">{stats.returnedToWarehouse} Local</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                FC Loss / Returned Stock
              </div>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Month Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-[#056468]" />
              <span>Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#056468] focus:outline-none cursor-pointer"
              >
                <option value={currentMonthStr}>{currentMonthStr} (Current Month)</option>
                {availableMonths
                  .filter((m) => m !== currentMonthStr)
                  .map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                <option value="ALL">All Time / All Months</option>
              </select>
            </div>

            {/* Channel Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-700">
              <Filter className="w-3.5 h-3.5 text-[#056468]" />
              <span>Channel:</span>
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-[#056468] focus:outline-none cursor-pointer"
              >
                <option value="ALL">All FBA Channels</option>
                <option value="AMAZON_FBA">Amazon FBA</option>
                <option value="FLIPKART_FBF">Flipkart FBF</option>
                <option value="MEESHO_3PL">Meesho 3PL</option>
                <option value="OTHER_3PL">Other FC</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchData()}
                placeholder="Search Barcode, SKU, Shipment..."
                className="text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg w-48 sm:w-60 focus:outline-none focus:border-[#056468]"
              />
            </div>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowQuickSkuTally(!showQuickSkuTally)}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>⚡ Quick SKU Tally</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Quick SKU Tally Popover Drawer */}
        {showQuickSkuTally && (
          <div className="bg-amber-50/90 border-b-2 border-amber-300 px-6 py-3.5 animate-in slide-in-from-top-2">
            <form onSubmit={handleQuickSkuTallySubmit} className="flex flex-col sm:flex-row items-start sm:items-end gap-3 justify-between">
              <div className="flex-1 space-y-1">
                <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Quick SKU Tally (Fast Reconcile from Monthly Sales Report)</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Select SKU and enter the total quantity sold this month as per Amazon MTR / Flipkart report. System will automatically reconcile sitting units!
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div>
                  <label className="block text-[10px] font-bold text-amber-900 uppercase">Select SKU</label>
                  <select
                    value={quickSku}
                    onChange={(e) => setQuickSku(e.target.value)}
                    className="text-xs font-bold font-mono px-3 py-1.5 bg-white border border-amber-400 rounded-lg focus:outline-none"
                  >
                    {skuSummary.map((s) => (
                      <option key={s.sku} value={s.sku}>
                        {s.sku} — {s.productName} ({s.kept} in FBA)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-amber-900 uppercase">Units Sold</label>
                  <input
                    type="number"
                    min="1"
                    max={activeSku ? activeSku.kept : 999}
                    value={quickQty}
                    onChange={(e) => setQuickQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-xs font-bold font-mono px-3 py-1.5 bg-white border border-amber-400 rounded-lg focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-amber-900 uppercase">Settlement Ref (Optional)</label>
                  <input
                    type="text"
                    value={quickNotes}
                    onChange={(e) => setQuickNotes(e.target.value)}
                    placeholder="e.g. Nov MTR Settlement"
                    className="w-40 text-xs px-2.5 py-1.5 bg-white border border-amber-400 rounded-lg focus:outline-none"
                  />
                </div>

                <div className="pt-3 flex gap-1.5">
                  <button
                    type="submit"
                    disabled={isSubmittingAction || !activeSku || activeSku.kept === 0}
                    className="px-4 py-1.5 bg-[#056468] hover:bg-[#044e51] text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSubmittingAction ? "Reconciling..." : "Mark Delivered & Sold"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQuickSkuTally(false)}
                    className="px-2.5 py-1.5 text-xs text-amber-800 hover:text-amber-950"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Status Tabs */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 pt-2 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => {
                setStatusTab("KEPT_AT_FBA");
                setSelectedIds([]);
              }}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-t-2 ${
                statusTab === "KEPT_AT_FBA"
                  ? "bg-white text-amber-950 border-amber-500 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60"
              }`}
            >
              <span>🏬 Units Kept at FBA (Sitting Stock)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800">
                {stats.currentlyKeptAtFba}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStatusTab("ORDERED_DELIVERED");
                setSelectedIds([]);
              }}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-t-2 ${
                statusTab === "ORDERED_DELIVERED"
                  ? "bg-white text-emerald-950 border-emerald-500 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60"
              }`}
            >
              <span>✅ Ordered & Delivered (Sold)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
                {stats.orderedDelivered}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStatusTab("ALL");
                setSelectedIds([]);
              }}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-t-2 ${
                statusTab === "ALL"
                  ? "bg-white text-[#056468] border-[#056468] shadow-xs"
                  : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60"
              }`}
            >
              <span>📋 All Units Transferred</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-800">
                {stats.totalTransferred}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStatusTab("DAMAGED");
                setSelectedIds([]);
              }}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-t-2 ${
                statusTab === "DAMAGED"
                  ? "bg-white text-rose-950 border-rose-500 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60"
              }`}
            >
              <span>⚠️ Damaged / Lost</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-800">
                {stats.damaged}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStatusTab("RETURNED_TO_WAREHOUSE");
                setSelectedIds([]);
              }}
              className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 border-t-2 ${
                statusTab === "RETURNED_TO_WAREHOUSE"
                  ? "bg-white text-blue-950 border-blue-500 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60"
              }`}
            >
              <span>🔄 Recalled to Local</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800">
                {stats.returnedToWarehouse}
              </span>
            </button>
          </div>
        </div>

        {/* Batch Reconcile Action Bar (Active when items are selected) */}
        {selectedIds.length > 0 && (
          <div className="bg-amber-100 border-b border-amber-300 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">
                {selectedIds.length}
              </span>
              <span>Unit(s) selected for action</span>
            </div>

            <div className="flex items-center gap-2">
              {statusTab === "KEPT_AT_FBA" && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowReconcilePrompt(!showReconcilePrompt)}
                    disabled={isSubmittingAction}
                    className="px-4 py-1.5 bg-[#056468] hover:bg-[#044e51] text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Mark Selected as Ordered / Delivered</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleReturnToWarehouse}
                    disabled={isSubmittingAction}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Recall to Local Stock</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleMarkDamaged}
                    disabled={isSubmittingAction}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Mark Damaged</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1.5 text-xs text-amber-900 hover:text-black font-semibold"
              >
                Deselect
              </button>
            </div>
          </div>
        )}

        {/* Inline Reconcile Modal / Form Drawer */}
        {showReconcilePrompt && (
          <div className="bg-emerald-50 border-b border-emerald-300 px-6 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in slide-in-from-top-1">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Confirm Sales Reconciliation ({selectedIds.length} Units)</span>
              </h4>
              <p className="text-[11px] text-emerald-800">
                These {selectedIds.length} units will be marked as SOLD & DELIVERED through {channelFilter !== "ALL" ? channelFilter : "Marketplace FBA"} in month {selectedMonth}.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={channelOrderIdInput}
                onChange={(e) => setChannelOrderIdInput(e.target.value)}
                placeholder="Marketplace Order ID (Optional)"
                className="text-xs px-2.5 py-1.5 bg-white border border-emerald-400 rounded-lg w-48 focus:outline-none"
              />
              <input
                type="text"
                value={reconcileNotes}
                onChange={(e) => setReconcileNotes(e.target.value)}
                placeholder="Settlement Notes / Remarks"
                className="text-xs px-2.5 py-1.5 bg-white border border-emerald-400 rounded-lg w-48 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleBatchMarkDelivered}
                disabled={isSubmittingAction}
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                {isSubmittingAction ? "Updating..." : "Confirm & Tally"}
              </button>
              <button
                type="button"
                onClick={() => setShowReconcilePrompt(false)}
                className="px-2.5 py-1.5 text-xs text-emerald-800 hover:text-emerald-950"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Feedback alerts */}
        {actionSuccess && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 text-xs font-bold text-emerald-800 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {actionSuccess}
            </span>
            <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-900">
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 text-xs font-bold text-rose-800 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              {error}
            </span>
            <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-900">
              ✕
            </button>
          </div>
        )}

        {/* Main Table Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500 space-y-2">
              <div className="w-8 h-8 border-2 border-[#056468] border-t-transparent rounded-full animate-spin mx-auto"></div>
              <div>Loading FBA units & tally data...</div>
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-700">No FBA Units Found</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No units match the selected filters ({statusTab}, {channelFilter}, {selectedMonth}).
                Scan and transfer physical units into FBA to start tracking.
              </p>
              {onOpenTransferModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenTransferModal();
                  }}
                  className="px-4 py-2 bg-[#056468] text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Bulk Scan Stock to FBA Now
                </button>
              )}
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3 w-10 text-center">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="text-slate-600 hover:text-black cursor-pointer"
                      >
                        {selectedIds.length === displayedItems.length && displayedItems.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-[#056468]" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </th>
                    <th className="p-3">Unit Barcode & Serial</th>
                    <th className="p-3">Product Name & SKU</th>
                    <th className="p-3">FBA Destination & Shipment</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Tally Month / Date</th>
                    <th className="p-3 text-right">Price</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedItems.map((item) => {
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
                              <Square className="w-4 h-4 text-slate-300 hover:text-slate-400" />
                            )}
                          </button>
                        </td>

                        {/* Barcode & Serial */}
                        <td className="p-3">
                          <div className="font-mono font-bold text-[#056468]">
                            {item.barcode}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Unit #{item.serialNumber}
                          </div>
                        </td>

                        {/* Product & SKU */}
                        <td className="p-3">
                          <div className="font-bold text-[#0b252c] max-w-xs truncate" title={item.productName}>
                            {item.productName}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 font-semibold">
                            SKU: {item.sku}
                          </div>
                        </td>

                        {/* FBA Info */}
                        <td className="p-3">
                          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                              {item.fbaTransfer?.channel === "AMAZON_FBA"
                                ? "Amazon FBA"
                                : item.fbaTransfer?.channel === "FLIPKART_FBF"
                                ? "Flipkart FBF"
                                : item.fbaTransfer?.channel || "FBA"}
                            </span>
                            <span className="text-[11px] text-slate-600 truncate max-w-[140px]" title={item.fbaTransfer?.destinationFc || ""}>
                              {item.fbaTransfer?.destinationFc || "FC Warehouse"}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            Shipment: {item.fbaTransfer?.shipmentNumber}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="p-3">
                          {item.status === "KEPT_AT_FBA" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              Kept at FBA
                            </span>
                          )}
                          {item.status === "ORDERED_DELIVERED" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Delivered / Sold
                            </span>
                          )}
                          {item.status === "DAMAGED" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                              Damaged in FC
                            </span>
                          )}
                          {item.status === "RETURNED_TO_WAREHOUSE" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                              Recalled to Local
                            </span>
                          )}
                        </td>

                        {/* Tally Month & Date */}
                        <td className="p-3">
                          <div className="font-bold text-slate-700">
                            {item.tallyMonth || "-"}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {item.tallyDate
                              ? new Date(item.tallyDate).toLocaleDateString()
                              : item.createdAt
                              ? new Date(item.createdAt).toLocaleDateString()
                              : "-"}
                          </div>
                          {item.channelOrderId && (
                            <div className="text-[10px] font-mono text-emerald-700 font-semibold truncate max-w-[120px]">
                              Ord: {item.channelOrderId}
                            </div>
                          )}
                        </td>

                        {/* Price */}
                        <td className="p-3 text-right font-mono font-bold text-slate-800">
                          ₹{item.sellingPrice.toFixed(2)}
                        </td>

                        {/* Row Quick Actions */}
                        <td className="p-3 text-right">
                          {item.status === "KEPT_AT_FBA" ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedIds([item.id]);
                                setShowReconcilePrompt(true);
                              }}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                            >
                              Mark Delivered
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRevertToKept(item.id)}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-medium transition-colors cursor-pointer"
                              title="Revert back to Kept at FBA stock"
                            >
                              Revert
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <strong>{displayedItems.length}</strong> unit(s) •{" "}
            <strong>{stats.currentlyKeptAtFba}</strong> kept at FBA FC •{" "}
            <strong>{stats.orderedDelivered}</strong> reconciled sold
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
