"use client";

import { useState } from "react";
import {
  BarChart3,
  IndianRupee,
  Package,
  ScanBarcode,
  TrendingUp,
  Download,
  FileSpreadsheet,
  Activity,
} from "lucide-react";
import { InventoryExportReport, InventoryExportRow, InventoryExportSummary } from "@/components/InventoryExportReport";
import { UserActivityTracker } from "@/components/UserActivityTracker";

interface ReportsClientProps {
  stats: {
    totalProducts: number;
    totalBarcodes: number;
    availableBarcodes: number;
    soldBarcodes: number;
    totalSalesCount: number;
    totalRevenue: number;
  };
  products: any[];
  initialRows?: InventoryExportRow[];
  initialSummary?: InventoryExportSummary;
}

export default function ReportsClient({
  stats,
  products,
  initialRows = [],
  initialSummary,
}: ReportsClientProps) {
  const [activeTab, setActiveTab] = useState<"INVENTORY" | "AUDIT">("INVENTORY");

  // Calculate inventory valuation
  const totalStockValuation = products.reduce((sum, p) => {
    const qty = p.variants?.[0]?.inventory?.quantity || 0;
    const price = p.offerPrice || p.variants?.[0]?.sellingPrice || 0;
    return sum + qty * price;
  }, 0);

  return (
    <div className="space-y-6 py-2">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#cce7ed] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#0b252c] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#056468]" />
            <span>Business Reports, Inventory Ledger & User Audit</span>
          </h1>
          <p className="text-xs text-[#4a6870] font-normal mt-0.5">
            Real-time stock reports tracking Opening Stock, Sales, Returns, Damages, Closing Stock, and complete User Activity Trail.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "INVENTORY" ? (
            <a
              href="/api/reports/inventory-export?format=csv"
              download
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Direct Inventory CSV</span>
            </a>
          ) : (
            <a
              href="/api/reports/audit-logs?format=csv"
              download
              className="px-3.5 py-2 bg-[#056468] hover:bg-[#0b252c] text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Direct Audit CSV</span>
            </a>
          )}
        </div>
      </div>

      {/* Top 4 Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#cce7ed] rounded-xl p-5 shadow-xs space-y-1">
          <div className="text-xs text-[#4a6870] font-medium flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#056468]" />
            <span>Total Stock Valuation</span>
          </div>
          <div className="text-2xl font-bold text-[#056468]">₹{totalStockValuation.toFixed(2)}</div>
          <div className="text-[11px] text-emerald-700 font-medium">Physical inventory asset value</div>
        </div>

        <div className="bg-white border border-[#cce7ed] rounded-xl p-5 shadow-xs space-y-1">
          <div className="text-xs text-[#4a6870] font-medium flex items-center gap-1.5">
            <IndianRupee className="w-3.5 h-3.5 text-[#056468]" />
            <span>Total POS Sales Revenue</span>
          </div>
          <div className="text-2xl font-bold text-[#0b252c]">₹{stats.totalRevenue.toFixed(2)}</div>
          <div className="text-[11px] text-[#4a6870] font-medium">{stats.totalSalesCount} Orders Completed</div>
        </div>

        <div className="bg-white border border-[#cce7ed] rounded-xl p-5 shadow-xs space-y-1">
          <div className="text-xs text-[#4a6870] font-medium flex items-center gap-1.5">
            <ScanBarcode className="w-3.5 h-3.5 text-[#056468]" />
            <span>Serial Barcodes Generated</span>
          </div>
          <div className="text-2xl font-bold text-[#0b252c]">{stats.totalBarcodes}</div>
          <div className="text-[11px] text-[#056468] font-medium">{stats.availableBarcodes} Units Available</div>
        </div>

        <div className="bg-white border border-[#cce7ed] rounded-xl p-5 shadow-xs space-y-1">
          <div className="text-xs text-[#4a6870] font-medium flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-[#056468]" />
            <span>Catalog Master Products</span>
          </div>
          <div className="text-2xl font-bold text-[#0b252c]">{stats.totalProducts}</div>
          <div className="text-[11px] text-[#4a6870] font-medium">{stats.soldBarcodes} Units Sold</div>
        </div>
      </div>

      {/* Reports Sub-Tab Navigation Bar */}
      <div className="flex items-center gap-2 border-b border-[#cce7ed] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("INVENTORY")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === "INVENTORY"
              ? "bg-[#056468] text-white shadow-xs"
              : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Inventory Movement & Stock Report</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("AUDIT")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === "AUDIT"
              ? "bg-[#056468] text-white shadow-xs"
              : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>User Activity Trail & Audit Tracker</span>
        </button>
      </div>

      {/* Render Active Tab Content */}
      {activeTab === "INVENTORY" ? (
        <InventoryExportReport
          initialRows={initialRows}
          initialSummary={initialSummary}
        />
      ) : (
        <UserActivityTracker />
      )}
    </div>
  );
}
