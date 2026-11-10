"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShoppingBag,
  SlidersHorizontal,
  Download,
  Printer,
  Search,
  RotateCcw,
  Calendar,
  Check,
  CheckSquare,
  Square,
  Building,
  User,
  Clock,
  Tag,
  Store,
  Layers,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  Package,
  IndianRupee,
  ChevronDown,
  X,
  FileSpreadsheet,
  Settings2,
} from "lucide-react";
import { OrderExportItemRow } from "@/app/api/reports/orders-export/route";

export interface ReportColumnConfig {
  key: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
}

export const AVAILABLE_REPORT_COLUMNS: ReportColumnConfig[] = [
  { key: "customerName", label: "Customer name", description: "Buyer or customer name", defaultEnabled: true },
  { key: "orderId", label: "Order id", description: "Order number or marketplace channel order ID", defaultEnabled: true },
  { key: "date", label: "Date", description: "Order placement / dispatch date", defaultEnabled: true },
  { key: "sku", label: "Sku", description: "Product item SKU code", defaultEnabled: true },
  { key: "amount", label: "Amount", description: "Item sale amount / total price", defaultEnabled: true },
  { key: "company", label: "Company name", description: "Channel name (Amazon, Flipkart, Meesho, Walk-in) or Company", defaultEnabled: true },
  { key: "outBy", label: "Out by whom", description: "Staff or Admin who dispatched / packed the item", defaultEnabled: true },
  { key: "productName", label: "Product name", description: "Full product item title", defaultEnabled: false },
  { key: "quantity", label: "Quantity", description: "Item units count", defaultEnabled: true },
  { key: "unitBarcode", label: "Barcode", description: "Physical scanned serial barcode", defaultEnabled: false },
  { key: "status", label: "Status", description: "Current fulfillment status (Delivered, Shipped, etc.)", defaultEnabled: false },
];

const DEFAULT_ENABLED_KEYS = AVAILABLE_REPORT_COLUMNS.filter((c) => c.defaultEnabled).map((c) => c.key);

const CHANNEL_OPTIONS = [
  { key: "ALL", label: "All Channels", color: "bg-slate-800 text-white border-slate-700" },
  { key: "AMAZON", label: "Amazon", color: "bg-amber-600 text-white border-amber-600", badge: "bg-amber-100 text-amber-900 border-amber-300" },
  { key: "FLIPKART", label: "Flipkart", color: "bg-blue-600 text-white border-blue-600", badge: "bg-blue-100 text-blue-900 border-blue-300" },
  { key: "POS", label: "Walk-in (POS)", color: "bg-emerald-600 text-white border-emerald-600", badge: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  { key: "WEBSITE", label: "Website Store", color: "bg-indigo-600 text-white border-indigo-600", badge: "bg-indigo-100 text-indigo-900 border-indigo-300" },
  { key: "MEESHO", label: "Meesho", color: "bg-fuchsia-600 text-white border-fuchsia-600", badge: "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300" },
];

export function ChannelOrdersReport() {
  const [rows, setRows] = useState<OrderExportItemRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Column Customization Settings State (persisted in localStorage)
  const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("order_report_selected_columns");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return DEFAULT_ENABLED_KEYS;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Channel Selection: Mode (Single vs Multi)
  const [isMultiChannelMode, setIsMultiChannelMode] = useState(false);
  const [selectedSingleChannel, setSelectedSingleChannel] = useState<string>("ALL");
  const [selectedMultiChannels, setSelectedMultiChannels] = useState<string[]>([
    "AMAZON",
    "FLIPKART",
    "POS",
    "WEBSITE",
    "MEESHO",
  ]);

  // Filters
  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState<"ALL" | "TODAY" | "7DAYS" | "30DAYS" | "THIS_MONTH" | "CUSTOM">("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [downloading, setDownloading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Save Column preferences to localStorage whenever changed
  const handleToggleColumn = (key: string) => {
    setSelectedColumnKeys((prev) => {
      let next: string[];
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev; // Keep at least one column
        next = prev.filter((k) => k !== key);
      } else {
        next = [...prev, key];
      }
      try {
        localStorage.setItem("order_report_selected_columns", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleSelectAllColumns = () => {
    const all = AVAILABLE_REPORT_COLUMNS.map((c) => c.key);
    setSelectedColumnKeys(all);
    try {
      localStorage.setItem("order_report_selected_columns", JSON.stringify(all));
    } catch {}
  };

  const handleResetDefaultColumns = () => {
    setSelectedColumnKeys(DEFAULT_ENABLED_KEYS);
    try {
      localStorage.setItem("order_report_selected_columns", JSON.stringify(DEFAULT_ENABLED_KEYS));
    } catch {}
  };

  // Determine active channels query parameter
  const activeChannelsQuery = useMemo(() => {
    if (!isMultiChannelMode) {
      return selectedSingleChannel;
    }
    if (selectedMultiChannels.length === 0 || selectedMultiChannels.length === CHANNEL_OPTIONS.length - 1) {
      return "ALL";
    }
    return selectedMultiChannels.join(",");
  }, [isMultiChannelMode, selectedSingleChannel, selectedMultiChannels]);

  // Fetch report data from API
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeChannelsQuery !== "ALL") {
        params.set("channels", activeChannelsQuery);
      }
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/reports/orders-export?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setRows(data.rows || []);
      }
    } catch (err) {
      console.error("Failed to load channel orders report:", err);
    } finally {
      setLoading(false);
    }
  }, [activeChannelsQuery, startDate, endDate, statusFilter, search]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Handle Date Presets
  const handleDatePresetChange = (preset: typeof datePreset) => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === "ALL") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "TODAY") {
      const todayStr = now.toISOString().slice(0, 10);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "7DAYS") {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === "30DAYS") {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === "THIS_MONTH") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    }
    setCurrentPage(1);
  };

  // Toggle multi-channel option
  const toggleMultiChannel = (chKey: string) => {
    setSelectedMultiChannels((prev) =>
      prev.includes(chKey) ? prev.filter((k) => k !== chKey) : [...prev, chKey]
    );
    setCurrentPage(1);
  };

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const uniqueOrders = new Set(rows.map((r) => r.orderNumber));
    const totalRevenue = rows.reduce((acc, r) => acc + r.amount, 0);
    const totalQuantity = rows.reduce((acc, r) => acc + r.quantity, 0);

    const amazonCount = rows.filter((r) => r.channel === "AMAZON").length;
    const flipkartCount = rows.filter((r) => r.channel === "FLIPKART").length;
    const posCount = rows.filter((r) => r.channel === "POS").length;
    const websiteCount = rows.filter((r) => r.channel === "WEBSITE").length;
    const meeshoCount = rows.filter((r) => r.channel === "MEESHO").length;

    return {
      orderCount: uniqueOrders.size,
      itemCount: rows.length,
      totalRevenue,
      totalQuantity,
      amazonCount,
      flipkartCount,
      posCount,
      websiteCount,
      meeshoCount,
    };
  }, [rows]);

  // Paginated Rows
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, currentPage, pageSize]);

  const totalPages = Math.ceil(rows.length / pageSize) || 1;

  // Active column configurations in order
  const activeColumns = useMemo(() => {
    return AVAILABLE_REPORT_COLUMNS.filter((c) => selectedColumnKeys.includes(c.key));
  }, [selectedColumnKeys]);

  // CSV Export Handler adhering strictly to selected columns
  const handleExportCSV = () => {
    setDownloading(true);
    try {
      const activeKeys = ["srNo", ...activeColumns.map((c) => c.key)];
      const headers = ["Srno", ...activeColumns.map((c) => c.label)];

      const csvLines = [
        headers.join(","),
        ...rows.map((r, idx) => {
          return activeKeys
            .map((k) => {
              if (k === "srNo") return idx + 1;
              if (k === "customerName") return `"${r.customerName.replace(/"/g, '""')}"`;
              if (k === "orderId") return `"${r.orderNumber.replace(/"/g, '""')}"`;
              if (k === "date") return `"${r.date}"`;
              if (k === "sku") return `"${r.sku.replace(/"/g, '""')}"`;
              if (k === "amount") return r.amount;
              if (k === "company") return `"${(r.company || r.channelLabel).replace(/"/g, '""')}"`;
              if (k === "outBy") return `"${(r.outBy || "Admin").replace(/"/g, '""')}"`;
              if (k === "productName") return `"${r.productName.replace(/"/g, '""')}"`;
              if (k === "quantity") return r.quantity;
              if (k === "unitBarcode") return `"${(r.unitBarcode || "").replace(/"/g, '""')}"`;
              if (k === "status") return `"${r.status}"`;
              return '""';
            })
            .join(",");
        }),
        // Summary row
        activeKeys
          .map((k) => {
            if (k === "srNo") return "TOTAL";
            if (k === "customerName") return `"${summaryMetrics.orderCount} Orders"`;
            if (k === "amount") return summaryMetrics.totalRevenue;
            if (k === "quantity") return summaryMetrics.totalQuantity;
            return '""';
          })
          .join(","),
      ];

      const blob = new Blob(["\uFEFF" + csvLines.join("\r\n")], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Order_Report_${activeChannelsQuery.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Export Error: " + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getChannelBadge = (ch: string) => {
    const chUpper = (ch || "").toUpperCase();
    if (chUpper.includes("AMAZON")) {
      return "bg-amber-100 text-amber-900 border-amber-300 font-bold";
    }
    if (chUpper.includes("FLIPKART")) {
      return "bg-blue-100 text-blue-900 border-blue-300 font-bold";
    }
    if (chUpper.includes("POS") || chUpper.includes("WALK")) {
      return "bg-emerald-100 text-emerald-900 border-emerald-300 font-bold";
    }
    if (chUpper.includes("MEESHO")) {
      return "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300 font-bold";
    }
    return "bg-indigo-100 text-indigo-900 border-indigo-300 font-bold";
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#cce7ed] rounded-xl p-5 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-[#0b252c] flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#056468]" />
            <span>Multi-Channel Orders & Dispatch Ledger</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#e3f2f5] text-[#056468] font-mono border border-[#cce7ed]">
              {summaryMetrics.orderCount} Orders / {rows.length} Items
            </span>
          </h2>
          <p className="text-xs text-[#4a6870] mt-1 max-w-2xl">
            Customizable sales and dispatch reports across Amazon, Flipkart, Walk-in POS, Meesho, and Website Store. Customize parameters anytime in settings.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Settings Button */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-[#056468] font-bold text-xs rounded-xl border border-[#056468]/30 shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
            title="Configure which parameters appear in report and export"
          >
            <Settings2 className="w-4 h-4 text-[#056468]" />
            <span>Report Settings ({selectedColumnKeys.length} Columns)</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
            title="Print or save as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={downloading || rows.length === 0}
            className="px-3.5 py-2 bg-[#056468] hover:bg-[#0b252c] text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading ? "Exporting..." : "Export CSV"}</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#cce7ed] rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Package className="w-3.5 h-3.5 text-[#056468]" />
            <span>Filtered Orders</span>
          </div>
          <div className="text-xl font-bold text-[#0b252c] mt-1">{summaryMetrics.orderCount}</div>
          <div className="text-[10px] text-slate-400">{summaryMetrics.itemCount} order line items</div>
        </div>

        <div className="bg-white border border-[#cce7ed] rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <IndianRupee className="w-3.5 h-3.5 text-[#056468]" />
            <span>Total Revenue</span>
          </div>
          <div className="text-xl font-bold text-emerald-700 mt-1">₹{summaryMetrics.totalRevenue.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400">Total gross value</div>
        </div>

        <div className="bg-white border border-[#cce7ed] rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-[#056468]" />
            <span>Units Dispatched</span>
          </div>
          <div className="text-xl font-bold text-[#056468] mt-1">{summaryMetrics.totalQuantity}</div>
          <div className="text-[10px] text-slate-400">Physical pieces out</div>
        </div>

        <div className="bg-white border border-[#cce7ed] rounded-xl p-4 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Building className="w-3.5 h-3.5 text-[#056468]" />
            <span>Channel Split</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-mono mt-1 font-semibold flex-wrap">
            <span className="text-amber-700">A:{summaryMetrics.amazonCount}</span>
            <span className="text-slate-300">|</span>
            <span className="text-blue-700">F:{summaryMetrics.flipkartCount}</span>
            <span className="text-slate-300">|</span>
            <span className="text-emerald-700">POS:{summaryMetrics.posCount}</span>
            <span className="text-slate-300">|</span>
            <span className="text-indigo-700">W:{summaryMetrics.websiteCount}</span>
          </div>
          <div className="text-[10px] text-slate-400">Marketplace distribution</div>
        </div>
      </div>

      {/* 3. Channel Selector & Single vs Multi Mode Toggler */}
      <div className="bg-white border border-[#cce7ed] rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-[#056468]" />
            <span className="text-xs font-bold text-[#0b252c] uppercase tracking-wider">
              Channel Selection ({isMultiChannelMode ? "Multi-Type Combined Mode" : "Single Channel Mode"})
            </span>
          </div>

          {/* Toggle between Single Type and Multi Type */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Report Mode:</span>
            <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setIsMultiChannelMode(false);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  !isMultiChannelMode
                    ? "bg-[#056468] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Single Channel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMultiChannelMode(true);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  isMultiChannelMode
                    ? "bg-[#056468] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Multi-Type Combined
              </button>
            </div>
          </div>
        </div>

        {/* Channel Selection UI based on Mode */}
        {!isMultiChannelMode ? (
          /* Single Channel Quick Pills */
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {CHANNEL_OPTIONS.map((ch) => {
              const isSelected = selectedSingleChannel === ch.key;
              const count =
                ch.key === "ALL"
                  ? summaryMetrics.orderCount
                  : ch.key === "AMAZON"
                  ? summaryMetrics.amazonCount
                  : ch.key === "FLIPKART"
                  ? summaryMetrics.flipkartCount
                  : ch.key === "POS"
                  ? summaryMetrics.posCount
                  : ch.key === "WEBSITE"
                  ? summaryMetrics.websiteCount
                  : summaryMetrics.meeshoCount;

              return (
                <button
                  key={ch.key}
                  type="button"
                  onClick={() => {
                    setSelectedSingleChannel(ch.key);
                    setCurrentPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 border ${
                    isSelected
                      ? `${ch.color} shadow-xs`
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  <span>{ch.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          /* Multi-Channel Checkbox Pills */
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setSelectedMultiChannels(["AMAZON", "FLIPKART", "POS", "WEBSITE", "MEESHO"]);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedMultiChannels([]);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Clear
              </button>

              <div className="h-4 w-px bg-slate-200 mx-1" />

              {CHANNEL_OPTIONS.filter((c) => c.key !== "ALL").map((ch) => {
                const isChecked = selectedMultiChannels.includes(ch.key);
                return (
                  <button
                    key={ch.key}
                    type="button"
                    onClick={() => toggleMultiChannel(ch.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
                      isChecked
                        ? `${ch.badge} font-bold shadow-2xs`
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {isChecked ? (
                      <CheckSquare className="w-3.5 h-3.5 text-[#056468]" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>{ch.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. Filters & Search Toolbar */}
      <div className="bg-white border border-[#cce7ed] rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by Customer name, Order ID, SKU, Barcode, or Out by..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-[#056468] focus:border-[#056468] text-slate-800"
          />
        </div>

        {/* Date Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { key: "ALL", label: "All Time" },
            { key: "TODAY", label: "Today" },
            { key: "7DAYS", label: "7 Days" },
            { key: "30DAYS", label: "30 Days" },
            { key: "THIS_MONTH", label: "This Month" },
            { key: "CUSTOM", label: "Custom Date" },
          ].map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => handleDatePresetChange(d.key as any)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                datePreset === d.key
                  ? "bg-[#056468] text-white shadow-2xs font-bold"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Custom Date Inputs if CUSTOM selected */}
        {datePreset === "CUSTOM" && (
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-700"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-700"
            />
          </div>
        )}

        <button
          type="button"
          onClick={fetchReportData}
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer shrink-0 transition-all"
          title="Refresh Report Data"
        >
          <RotateCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* 5. Main Custom Table */}
      <div className="bg-white border border-[#cce7ed] rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center space-y-2">
            <RotateCcw className="w-8 h-8 text-[#056468] animate-spin mx-auto opacity-70" />
            <div className="text-xs font-semibold text-slate-700">Loading multi-channel order reports...</div>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-xs font-semibold text-slate-700">No orders found matching your filters</div>
            <p className="text-xs text-slate-400">
              Try switching channels, resetting the date filter, or clearing your search.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#f0f8fa] text-[#0b252c] font-bold border-b border-[#cce7ed] uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3 w-12 text-center">Srno</th>
                  {activeColumns.map((col) => (
                    <th
                      key={col.key}
                      className={`p-3 ${
                        col.key === "amount" || col.key === "quantity" ? "text-right" : ""
                      }`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {paginatedRows.map((row, idx) => {
                  const actualSrno = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={`${row.orderId}-${row.sku}-${actualSrno}`} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-center font-mono font-medium text-slate-500">
                        {actualSrno}
                      </td>

                      {activeColumns.map((col) => {
                        if (col.key === "customerName") {
                          return (
                            <td key={col.key} className="p-3 font-semibold text-[#0b252c]">
                              <div className="flex flex-col">
                                <span className="truncate max-w-[170px]" title={row.customerName}>
                                  {row.customerName}
                                </span>
                                {row.customerPhone && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {row.customerPhone}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        }

                        if (col.key === "orderId") {
                          return (
                            <td key={col.key} className="p-3 font-mono text-[11.5px] font-bold text-[#056468]">
                              <span className="truncate max-w-[150px] block" title={row.orderNumber}>
                                {row.orderNumber}
                              </span>
                            </td>
                          );
                        }

                        if (col.key === "date") {
                          return (
                            <td key={col.key} className="p-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                              {row.date}
                            </td>
                          );
                        }

                        if (col.key === "sku") {
                          return (
                            <td key={col.key} className="p-3 font-mono text-[11.5px] font-bold text-slate-800">
                              <span className="truncate max-w-[140px] block" title={row.sku}>
                                {row.sku}
                              </span>
                            </td>
                          );
                        }

                        if (col.key === "amount") {
                          return (
                            <td key={col.key} className="p-3 text-right font-mono font-bold text-[#056468] text-[12.5px]">
                              ₹{row.amount.toLocaleString()}
                            </td>
                          );
                        }

                        if (col.key === "company") {
                          return (
                            <td key={col.key} className="p-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] border ${getChannelBadge(row.channel)}`}>
                                {row.company || row.channelLabel}
                              </span>
                            </td>
                          );
                        }

                        if (col.key === "outBy") {
                          return (
                            <td key={col.key} className="p-3 font-semibold text-slate-700">
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-[#e3f2f5] text-[#056468] flex items-center justify-center font-bold text-[9px] shrink-0 border border-[#cce7ed]">
                                  {(row.outBy || "A")[0].toUpperCase()}
                                </div>
                                <span className="truncate max-w-[120px]" title={row.outBy}>
                                  {row.outBy || "Admin"}
                                </span>
                              </div>
                            </td>
                          );
                        }

                        if (col.key === "productName") {
                          return (
                            <td key={col.key} className="p-3 text-slate-700 font-medium max-w-[200px]">
                              <span className="truncate block" title={row.productName}>
                                {row.productName}
                              </span>
                            </td>
                          );
                        }

                        if (col.key === "quantity") {
                          return (
                            <td key={col.key} className="p-3 text-right font-mono font-bold text-slate-800">
                              {row.quantity}
                            </td>
                          );
                        }

                        if (col.key === "unitBarcode") {
                          return (
                            <td key={col.key} className="p-3 font-mono text-[11px] text-[#056468]">
                              {row.unitBarcode || "—"}
                            </td>
                          );
                        }

                        if (col.key === "status") {
                          return (
                            <td key={col.key} className="p-3">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                {row.status}
                              </span>
                            </td>
                          );
                        }

                        return null;
                      })}
                    </tr>
                  );
                })}
              </tbody>

              {/* Total Summary Footer Row */}
              <tfoot className="bg-[#f0f8fa] border-t-2 border-[#cce7ed] font-bold text-xs text-[#0b252c]">
                <tr>
                  <td className="p-3 text-center font-mono">∑</td>
                  {activeColumns.map((col) => {
                    if (col.key === "customerName") {
                      return (
                        <td key={col.key} className="p-3 uppercase tracking-wider font-extrabold text-[#056468]">
                          TOTAL ({summaryMetrics.orderCount} Orders)
                        </td>
                      );
                    }
                    if (col.key === "amount") {
                      return (
                        <td key={col.key} className="p-3 text-right font-mono text-emerald-800 font-extrabold text-[13px]">
                          ₹{summaryMetrics.totalRevenue.toLocaleString()}
                        </td>
                      );
                    }
                    if (col.key === "quantity") {
                      return (
                        <td key={col.key} className="p-3 text-right font-mono text-slate-800 font-extrabold text-[12px]">
                          {summaryMetrics.totalQuantity}
                        </td>
                      );
                    }
                    return <td key={col.key} className="p-3 text-slate-400 font-mono">—</td>;
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {rows.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 border-t border-[#cce7ed] bg-white text-xs">
            <div className="text-slate-500 text-[11px]">
              Showing <strong className="text-slate-800">{(currentPage - 1) * pageSize + 1}</strong> to{" "}
              <strong className="text-slate-800">{Math.min(currentPage * pageSize, rows.length)}</strong> of{" "}
              <strong className="text-slate-800">{rows.length}</strong> items
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-[11px]">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value, 10));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 border border-slate-300 rounded text-xs bg-white text-slate-800"
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              <div className="flex items-center gap-1 ml-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs font-semibold"
                >
                  Prev
                </button>
                <span className="px-2 font-mono text-[11px] text-slate-600">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs font-semibold"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. Settings Modal (Select each and every parameter to be present in report) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-[#f0f8fa]">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-[#056468]" />
                <div>
                  <h3 className="font-bold text-sm text-[#0b252c]">Customize Report Parameters</h3>
                  <p className="text-[11px] text-slate-500">
                    Select which parameters will appear in the report table & CSV export.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body - Parameter Checkboxes */}
            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs">
                <span className="text-slate-500 font-medium">
                  {selectedColumnKeys.length} of {AVAILABLE_REPORT_COLUMNS.length} parameters active
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllColumns}
                    className="text-[#056468] hover:underline font-bold text-xs cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleResetDefaultColumns}
                    className="text-slate-500 hover:underline font-medium text-xs cursor-pointer"
                  >
                    Reset Defaults
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                {AVAILABLE_REPORT_COLUMNS.map((col) => {
                  const isChecked = selectedColumnKeys.includes(col.key);
                  return (
                    <label
                      key={col.key}
                      className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isChecked
                          ? "bg-[#e3f2f5]/50 border-[#056468]/30 shadow-2xs"
                          : "bg-white border-slate-200 hover:bg-slate-50 opacity-80"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleColumn(col.key)}
                        className="mt-0.5 rounded text-[#056468] focus:ring-[#056468] cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-[#0b252c]">{col.label}</span>
                          {["customerName", "orderId", "date", "sku", "amount", "company", "outBy"].includes(col.key) && (
                            <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold">
                              Core
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                          {col.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Preferences saved automatically to browser device
              </span>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 bg-[#056468] hover:bg-[#0b252c] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all"
              >
                Apply & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

