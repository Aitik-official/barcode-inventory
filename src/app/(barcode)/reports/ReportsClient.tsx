"use client";

import { useState } from "react";
import {
  BarChart3,
  IndianRupee,
  Package,
  ScanBarcode,
  CheckCircle2,
  FileSpreadsheet,
  Download,
  Printer,
  TrendingUp,
} from "lucide-react";

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
}

export default function ReportsClient({ stats, products }: ReportsClientProps) {
  const [downloading, setDownloading] = useState(false);

  // Calculate inventory valuation
  const totalStockValuation = products.reduce((sum, p) => {
    const qty = p.variants?.[0]?.inventory?.quantity || 0;
    const price = p.offerPrice || p.variants?.[0]?.sellingPrice || 0;
    return sum + qty * price;
  }, 0);

  const handleExportCSV = () => {
    setDownloading(true);
    try {
      const headers = ["Product Name", "SKU", "Category", "In Stock (Units)", "Offer Price (INR)", "Stock Valuation (INR)", "Website Status"];
      const rows = products.map((p) => {
        const v = p.variants?.[0];
        const qty = v?.inventory?.quantity || 0;
        const price = p.offerPrice || v?.sellingPrice || 0;
        const val = qty * price;
        return [
          `"${p.name.replace(/"/g, '""')}"`,
          `"${v?.sku || "SKU"}"`,
          `"${p.category?.name || "General"}"`,
          qty,
          price.toFixed(2),
          val.toFixed(2),
          p.showOnWebsite ? "Visible" : "Hidden",
        ];
      });

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `inventory_report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e: any) {
      alert("Export Error: " + e.message);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-6 py-2">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#cce7ed] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#0b252c] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#056468]" />
            <span>Business Reports & Stock Valuation</span>
          </h1>
          <p className="text-xs text-[#4a6870] font-normal mt-0.5">
            Real-time analytics on per-unit barcode inventory, valuation metrics, and POS sales volume.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={downloading}
            className="px-3.5 py-2 bg-white hover:bg-[#f0f8fa] text-[#056468] font-medium text-xs rounded-lg border border-[#cce7ed] shadow-sm transition-all flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? "Exporting..." : "Export CSV"}</span>
          </button>

          <button
            type="button"
            onClick={handlePrintReport}
            className="px-4 py-2 bg-[#056468] hover:bg-[#044e51] text-white font-medium text-xs rounded-lg shadow-sm transition-all flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Top 4 Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#cce7ed] rounded-xl p-5 shadow-sm space-y-1">
          <div className="text-xs text-[#4a6870] font-medium flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#056468]" />
            <span>Total Stock Valuation</span>
          </div>
          <div className="text-2xl font-bold text-[#056468]">₹{totalStockValuation.toFixed(2)}</div>
          <div className="text-[11px] text-emerald-700 font-medium">Physical inventory asset value</div>
        </div>

        <div className="bg-white border border-[#cce7ed] rounded-xl p-5 shadow-sm space-y-1">
          <div className="text-xs text-[#4a6870] font-medium flex items-center gap-1.5">
            <IndianRupee className="w-3.5 h-3.5 text-[#056468]" />
            <span>Total POS Sales Revenue</span>
          </div>
          <div className="text-2xl font-bold text-[#0b252c]">₹{stats.totalRevenue.toFixed(2)}</div>
          <div className="text-[11px] text-[#4a6870] font-medium">{stats.totalSalesCount} Orders Completed</div>
        </div>

        <div className="bg-white border border-[#cce7ed] rounded-xl p-5 shadow-sm space-y-1">
          <div className="text-xs text-[#4a6870] font-medium flex items-center gap-1.5">
            <ScanBarcode className="w-3.5 h-3.5 text-[#056468]" />
            <span>Serial Barcodes Generated</span>
          </div>
          <div className="text-2xl font-bold text-[#0b252c]">{stats.totalBarcodes}</div>
          <div className="text-[11px] text-[#056468] font-medium">{stats.availableBarcodes} Units Available</div>
        </div>

        <div className="bg-white border border-[#cce7ed] rounded-xl p-5 shadow-sm space-y-1">
          <div className="text-xs text-[#4a6870] font-medium flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-[#056468]" />
            <span>Catalog Master Products</span>
          </div>
          <div className="text-2xl font-bold text-[#0b252c]">{stats.totalProducts}</div>
          <div className="text-[11px] text-[#4a6870] font-medium">{stats.soldBarcodes} Units Sold</div>
        </div>
      </div>

      {/* Valuation Breakdown Table */}
      <div className="bg-white border border-[#cce7ed] rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-[#cce7ed] pb-3">
          <h2 className="text-base font-semibold text-[#0b252c] flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#056468]" />
            <span>Product-Wise Stock & Valuation Ledger</span>
          </h2>
          <span className="text-xs text-[#056468] font-bold font-mono">
            {products.length} Products Tracked
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[#cce7ed]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f0f8fa] text-[#0b252c] font-semibold uppercase tracking-wider border-b border-[#cce7ed]">
              <tr>
                <th className="p-3">Product Name</th>
                <th className="p-3">SKU</th>
                <th className="p-3">Category</th>
                <th className="p-3 text-right">In Stock (Units)</th>
                <th className="p-3 text-right">Unit Price</th>
                <th className="p-3 text-right">Total Valuation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#cce7ed] font-normal">
              {products.map((p) => {
                const v = p.variants?.[0];
                const qty = v?.inventory?.quantity || 0;
                const price = p.offerPrice || v?.sellingPrice || 0;
                const val = qty * price;
                return (
                  <tr key={p.id} className="hover:bg-[#f8fcfe]">
                    <td className="p-3 font-semibold text-[#0b252c]">{p.name}</td>
                    <td className="p-3 text-[#5f818b] font-mono text-[11px]">{v?.sku || "SKU"}</td>
                    <td className="p-3 text-[#056468]">{p.category?.name || "General"}</td>
                    <td className="p-3 text-right font-bold text-[#056468] font-mono">{qty}</td>
                    <td className="p-3 text-right font-medium text-[#0b252c] font-mono">₹{price.toFixed(2)}</td>
                    <td className="p-3 text-right font-bold text-[#056468] font-mono">₹{val.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
