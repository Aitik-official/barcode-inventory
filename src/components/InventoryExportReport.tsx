"use client";

import { useState, useEffect, useMemo } from "react";
import {
  FileSpreadsheet,
  Download,
  Printer,
  Search,
  RotateCcw,
  Package,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  FileText,
} from "lucide-react";

export interface InventoryExportRow {
  srNo: number;
  productName: string;
  sku: string;
  openingStock: number;
  sold: number;
  returns: number;
  damage: number;
  closingStock: number;
  stockStatus: string;
  offerPrice?: number;
  valuation?: number;
  category?: string;
}

export interface InventoryExportSummary {
  totalItems: number;
  totalOpeningStock: number;
  totalSold: number;
  totalReturns: number;
  totalDamage: number;
  totalClosingStock: number;
  totalValuation: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
}

interface InventoryExportReportProps {
  initialRows?: InventoryExportRow[];
  initialSummary?: InventoryExportSummary;
  standalone?: boolean;
}

export function InventoryExportReport({
  initialRows,
  initialSummary,
  standalone = false,
}: InventoryExportReportProps) {
  const [rows, setRows] = useState<InventoryExportRow[]>(initialRows || []);
  const [summary, setSummary] = useState<InventoryExportSummary | null>(initialSummary || null);
  const [loading, setLoading] = useState<boolean>(!initialRows || initialRows.length === 0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK">("ALL");
  const [downloading, setDownloading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/inventory-export");
      const data = await res.json();
      if (res.ok && data.success) {
        setRows(data.rows || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error("Failed to load inventory export report:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialRows || initialRows.length === 0) {
      fetchReportData();
    }
  }, [initialRows]);

  // Client-side filtering
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // 1. Status Filter
      if (statusFilter !== "ALL") {
        const target =
          statusFilter === "OUT_OF_STOCK"
            ? "Out of Stock"
            : statusFilter === "LOW_STOCK"
            ? "Low Stock"
            : "In Stock";
        if (r.stockStatus !== target) return false;
      }

      // 2. Search
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        r.productName.toLowerCase().includes(q) ||
        r.sku.toLowerCase().includes(q) ||
        (r.category && r.category.toLowerCase().includes(q))
      );
    });
  }, [rows, statusFilter, search]);

  // Dynamic summary of filtered view
  const currentSummary = useMemo(() => {
    return {
      totalItems: filteredRows.length,
      totalOpeningStock: filteredRows.reduce((sum, r) => sum + r.openingStock, 0),
      totalSold: filteredRows.reduce((sum, r) => sum + r.sold, 0),
      totalReturns: filteredRows.reduce((sum, r) => sum + r.returns, 0),
      totalDamage: filteredRows.reduce((sum, r) => sum + r.damage, 0),
      totalClosingStock: filteredRows.reduce((sum, r) => sum + r.closingStock, 0),
    };
  }, [filteredRows]);

  // Paginated Rows
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;

  // Export CSV Handler
  const handleExportCSV = (filenameSuffix = "csv") => {
    setDownloading(true);
    try {
      const headers = [
        "Srno",
        "product name",
        "Sku",
        "Opening stock",
        "Sold",
        "Return",
        "Damage",
        "Closing stock",
        "Stock status",
      ];

      const csvLines = [
        headers.join(","),
        ...filteredRows.map((r, index) =>
          [
            index + 1,
            `"${r.productName.replace(/"/g, '""')}"`,
            `"${r.sku.replace(/"/g, '""')}"`,
            r.openingStock,
            r.sold,
            r.returns,
            r.damage,
            r.closingStock,
            `"${r.stockStatus}"`,
          ].join(",")
        ),
        // Total summary row at bottom
        [
          "TOTAL",
          `"Summary (${filteredRows.length} Items)"`,
          `""`,
          currentSummary.totalOpeningStock,
          currentSummary.totalSold,
          currentSummary.totalReturns,
          currentSummary.totalDamage,
          currentSummary.totalClosingStock,
          `""`,
        ].join(","),
      ];

      // UTF-8 BOM
      const blob = new Blob(["\uFEFF" + csvLines.join("\r\n")], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Inventory_Report_${new Date().toISOString().slice(0, 10)}.${filenameSuffix}`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("Export Error: " + e.message);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#cce7ed] rounded-xl p-5 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-[#0b252c] flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#056468]" />
            <span>Inventory Movement & Stock Report</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#e3f2f5] text-[#056468] font-mono border border-[#cce7ed]">
              {filteredRows.length} SKUs Listed
            </span>
          </h2>
          <p className="text-xs text-[#4a6870] mt-1 max-w-2xl">
            Complete inventory stock ledger showing Opening Stock, Units Sold, Customer Returns, Damages, Closing Stock, and Stock Status per product SKU.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={fetchReportData}
            disabled={loading}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Refresh inventory counts"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => handleExportCSV("csv")}
            disabled={downloading || filteredRows.length === 0}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            title="Export filtered table as CSV file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading ? "Exporting..." : "Export CSV"}</span>
          </button>

          <button
            type="button"
            onClick={() => handleExportCSV("csv")}
            disabled={downloading || filteredRows.length === 0}
            className="px-3.5 py-2 bg-[#056468] hover:bg-[#044e51] text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            title="Export for Microsoft Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Excel Export</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Print or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-[#cce7ed] rounded-xl p-3.5 shadow-2xs space-y-1">
          <div className="text-[11px] text-[#4a6870] font-medium flex items-center gap-1">
            <Package className="w-3.5 h-3.5 text-[#056468]" />
            <span>Opening Stock</span>
          </div>
          <div className="text-xl font-bold text-[#0b252c] font-mono">
            {currentSummary.totalOpeningStock.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500">Initial units tracked</div>
        </div>

        <div className="bg-white border border-[#cce7ed] rounded-xl p-3.5 shadow-2xs space-y-1">
          <div className="text-[11px] text-[#4a6870] font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
            <span>Total Sold</span>
          </div>
          <div className="text-xl font-bold text-purple-700 font-mono">
            {currentSummary.totalSold.toLocaleString()}
          </div>
          <div className="text-[10px] text-purple-700/80">Units dispatched</div>
        </div>

        <div className="bg-white border border-[#cce7ed] rounded-xl p-3.5 shadow-2xs space-y-1">
          <div className="text-[11px] text-[#4a6870] font-medium flex items-center gap-1">
            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
            <span>Returned</span>
          </div>
          <div className="text-xl font-bold text-amber-700 font-mono">
            {currentSummary.totalReturns.toLocaleString()}
          </div>
          <div className="text-[10px] text-amber-700/80">Restocked / in-return</div>
        </div>

        <div className="bg-white border border-[#cce7ed] rounded-xl p-3.5 shadow-2xs space-y-1">
          <div className="text-[11px] text-[#4a6870] font-medium flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
            <span>Damaged</span>
          </div>
          <div className="text-xl font-bold text-rose-700 font-mono">
            {currentSummary.totalDamage.toLocaleString()}
          </div>
          <div className="text-[10px] text-rose-700/80">Defective / written off</div>
        </div>

        <div className="bg-white border border-[#cce7ed] rounded-xl p-3.5 shadow-2xs space-y-1">
          <div className="text-[11px] text-[#4a6870] font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Closing Stock</span>
          </div>
          <div className="text-xl font-bold text-emerald-700 font-mono">
            {currentSummary.totalClosingStock.toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-700/80">Available right now</div>
        </div>

        <div className="bg-white border border-[#cce7ed] rounded-xl p-3.5 shadow-2xs space-y-1">
          <div className="text-[11px] text-[#4a6870] font-medium flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>Stock Health</span>
          </div>
          <div className="text-sm font-bold text-[#0b252c] flex items-center gap-2 pt-1">
            <span className="text-emerald-700" title="In Stock">
              {rows.filter((r) => r.stockStatus === "In Stock").length} ok
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-rose-600" title="Out of Stock">
              {rows.filter((r) => r.stockStatus === "Out of Stock").length} out
            </span>
          </div>
          <div className="text-[10px] text-slate-500">
            {rows.filter((r) => r.stockStatus === "Low Stock").length} low stock
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#cce7ed] rounded-xl p-3 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search product name, SKU..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#056468]"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setStatusFilter("ALL");
              setCurrentPage(1);
            }}
            className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "ALL"
                ? "bg-[#056468] text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({rows.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter("IN_STOCK");
              setCurrentPage(1);
            }}
            className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "IN_STOCK"
                ? "bg-emerald-700 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            In Stock ({rows.filter((r) => r.stockStatus === "In Stock").length})
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter("LOW_STOCK");
              setCurrentPage(1);
            }}
            className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "LOW_STOCK"
                ? "bg-amber-600 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Low Stock ({rows.filter((r) => r.stockStatus === "Low Stock").length})
          </button>

          <button
            type="button"
            onClick={() => {
              setStatusFilter("OUT_OF_STOCK");
              setCurrentPage(1);
            }}
            className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === "OUT_OF_STOCK"
                ? "bg-rose-700 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Out of Stock ({rows.filter((r) => r.stockStatus === "Out of Stock").length})
          </button>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-white border border-[#cce7ed] rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center space-y-2">
            <RotateCcw className="w-8 h-8 text-[#056468] animate-spin mx-auto opacity-70" />
            <div className="text-xs font-semibold text-slate-700">Loading inventory stock report...</div>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Package className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-xs font-semibold text-slate-700">No matching inventory records found</div>
            <p className="text-xs text-slate-400">
              {search ? `No products match "${search}"` : "Add or receive stock to generate your report."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#f0f8fa] text-[#0b252c] font-bold border-b border-[#cce7ed] uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3 w-14 text-center">Srno</th>
                  <th className="p-3 min-w-[200px]">product name</th>
                  <th className="p-3 min-w-[130px]">Sku</th>
                  <th className="p-3 text-right">Opening stock</th>
                  <th className="p-3 text-right text-purple-900">Sold</th>
                  <th className="p-3 text-right text-amber-900">Return</th>
                  <th className="p-3 text-right text-rose-900">Damage</th>
                  <th className="p-3 text-right text-emerald-900 bg-emerald-50/50">Closing stock</th>
                  <th className="p-3 text-center min-w-[110px]">Stock status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {paginatedRows.map((row, idx) => {
                  const actualSrno = (currentPage - 1) * pageSize + idx + 1;
                  const isOutOfStock = row.closingStock === 0;
                  const isLowStock = row.closingStock > 0 && row.closingStock <= 5;

                  return (
                    <tr
                      key={`${row.sku}-${actualSrno}`}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* 1. Srno */}
                      <td className="p-3 text-center font-mono font-medium text-slate-500">
                        {actualSrno}
                      </td>

                      {/* 2. Product Name */}
                      <td className="p-3 font-semibold text-[#0b252c]">
                        <div className="flex items-center gap-1.5">
                          <span>{row.productName}</span>
                          {row.category && (
                            <span className="text-[10px] font-normal text-slate-400 px-1.5 py-0.2 bg-slate-100 rounded">
                              {row.category}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. SKU */}
                      <td className="p-3 font-mono text-[11.5px] font-medium text-[#056468]">
                        {row.sku}
                      </td>

                      {/* 4. Opening stock */}
                      <td className="p-3 text-right font-mono text-slate-700 font-semibold">
                        {row.openingStock}
                      </td>

                      {/* 5. Sold */}
                      <td className="p-3 text-right font-mono font-bold text-purple-700">
                        {row.sold}
                      </td>

                      {/* 6. Return */}
                      <td className="p-3 text-right font-mono font-bold text-amber-700">
                        {row.returns > 0 ? `+${row.returns}` : 0}
                      </td>

                      {/* 7. Damage */}
                      <td className="p-3 text-right font-mono font-bold text-rose-600">
                        {row.damage > 0 ? `-${row.damage}` : 0}
                      </td>

                      {/* 8. Closing stock */}
                      <td className="p-3 text-right font-mono font-bold text-emerald-800 bg-emerald-50/40 text-[12.5px]">
                        {row.closingStock}
                      </td>

                      {/* 9. Stock status */}
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                            isOutOfStock
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : isLowStock
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          }`}
                        >
                          {isOutOfStock ? (
                            <>
                              <XCircle className="w-3 h-3 text-rose-600" />
                              <span>Out of Stock</span>
                            </>
                          ) : isLowStock ? (
                            <>
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>Low Stock</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>In Stock</span>
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Total Summary Row at Bottom */}
              <tfoot className="bg-[#f0f8fa] border-t-2 border-[#cce7ed] font-bold text-xs text-[#0b252c]">
                <tr>
                  <td className="p-3 text-center font-mono">∑</td>
                  <td className="p-3 uppercase tracking-wider font-extrabold text-[#056468]">
                    TOTAL ({filteredRows.length} SKUs)
                  </td>
                  <td className="p-3 text-slate-400 font-mono text-[11px]">—</td>
                  <td className="p-3 text-right font-mono text-slate-800 font-extrabold text-[12px]">
                    {currentSummary.totalOpeningStock.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-purple-800 font-extrabold text-[12px]">
                    {currentSummary.totalSold.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-amber-800 font-extrabold text-[12px]">
                    +{currentSummary.totalReturns.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-rose-800 font-extrabold text-[12px]">
                    -{currentSummary.totalDamage.toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-900 bg-emerald-100/60 font-black text-[13px]">
                    {currentSummary.totalClosingStock.toLocaleString()}
                  </td>
                  <td className="p-3 text-center text-slate-500 font-normal text-[11px]">
                    {rows.filter((r) => r.stockStatus === "In Stock").length} In Stock
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredRows.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 border-t border-[#cce7ed] bg-white text-xs">
            <div className="text-slate-500 text-[11px]">
              Showing <strong className="text-slate-800">{(currentPage - 1) * pageSize + 1}</strong> to{" "}
              <strong className="text-slate-800">
                {Math.min(currentPage * pageSize, filteredRows.length)}
              </strong>{" "}
              of <strong className="text-slate-800">{filteredRows.length}</strong> items
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-[11px]">Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-700 cursor-pointer focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>

              <div className="flex items-center gap-1 ml-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 cursor-pointer text-xs"
                >
                  Prev
                </button>
                <span className="px-2 font-mono text-slate-600 text-[11px]">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 cursor-pointer text-xs"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
