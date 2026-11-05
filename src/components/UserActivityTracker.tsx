"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  RotateCcw,
  User,
  Clock,
  Tag,
  Package,
  Layers,
  ArrowRight,
  Activity,
  FileText,
  AlertTriangle,
  PlusCircle,
  Edit,
  Trash2,
  RefreshCw,
} from "lucide-react";

export interface AuditRecord {
  id: string;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  sku?: string | null;
  productName?: string | null;
  details?: string | null;
  performedBy: string;
  createdAt: string;
}

export function UserActivityTracker() {
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Filters
  const [search, setSearch] = useState<string>("");
  const [userFilter, setUserFilter] = useState<string>("ALL");
  const [actionFilter, setActionFilter] = useState<string>("ALL");

  // Options
  const [userOptions, setUserOptions] = useState<string[]>([]);
  const [actionOptions, setActionOptions] = useState<string[]>([]);
  const [exporting, setExporting] = useState<boolean>(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });
      if (search.trim()) params.set("search", search.trim());
      if (userFilter !== "ALL") params.set("user", userFilter);
      if (actionFilter !== "ALL") params.set("action", actionFilter);

      const res = await fetch(`/api/reports/audit-logs?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        if (data.users && data.users.length > 0) setUserOptions(data.users);
        if (data.actions && data.actions.length > 0) setActionOptions(data.actions);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, userFilter, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExportCSV = () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ format: "csv" });
      if (search.trim()) params.set("search", search.trim());
      if (userFilter !== "ALL") params.set("user", userFilter);
      if (actionFilter !== "ALL") params.set("action", actionFilter);

      window.open(`/api/reports/audit-logs?${params.toString()}`, "_blank");
    } finally {
      setExporting(false);
    }
  };

  const getActionBadge = (action: string) => {
    const act = (action || "").toUpperCase();
    if (act.includes("CREATE") || act.includes("GENERATE")) {
      return {
        bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
        icon: <PlusCircle className="w-3 h-3 text-emerald-600" />,
      };
    }
    if (act.includes("DELETE") || act.includes("REDUCE") || act.includes("WASTE")) {
      return {
        bg: "bg-rose-50 text-rose-800 border-rose-200",
        icon: <Trash2 className="w-3 h-3 text-rose-600" />,
      };
    }
    if (act.includes("RETURN")) {
      return {
        bg: "bg-amber-50 text-amber-800 border-amber-200",
        icon: <RefreshCw className="w-3 h-3 text-amber-600" />,
      };
    }
    return {
      bg: "bg-blue-50 text-blue-800 border-blue-200",
      icon: <Edit className="w-3 h-3 text-blue-600" />,
    };
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#cce7ed] rounded-xl p-5 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-[#0b252c] flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#056468]" />
            <span>User Action & Activity Trail</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#e3f2f5] text-[#056468] font-mono border border-[#cce7ed]">
              {total} Total Actions Logged
            </span>
          </h2>
          <p className="text-xs text-[#4a6870] mt-1 max-w-2xl">
            Real-time audit log tracking creations, modifications, stock adjustments, barcode deletions, and returns across all users and system administrators.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchLogs}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
            title="Refresh logs"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={exporting}
            className="px-3.5 py-2 bg-[#056468] hover:bg-[#0b252c] text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exporting ? "Preparing..." : "Export Activity CSV"}</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-[#cce7ed] rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by SKU, Product Name, Action, or User..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-[#056468] focus:border-[#056468] text-slate-800"
          />
        </div>

        {/* User Dropdown */}
        <div className="flex items-center gap-2 min-w-[180px]">
          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={userFilter}
            onChange={(e) => {
              setUserFilter(e.target.value);
              setPage(1);
            }}
            className="w-full py-2 px-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 font-medium"
          >
            <option value="ALL">All Users / Admins</option>
            {userOptions.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        {/* Action Dropdown */}
        <div className="flex items-center gap-2 min-w-[180px]">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="w-full py-2 px-2.5 rounded-lg border border-slate-300 text-xs bg-white text-slate-700 font-medium"
          >
            <option value="ALL">All Action Types</option>
            {actionOptions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-[#cce7ed] rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center space-y-2">
            <RotateCcw className="w-8 h-8 text-[#056468] animate-spin mx-auto opacity-70" />
            <div className="text-xs font-semibold text-slate-700">Loading activity trail...</div>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Activity className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-xs font-semibold text-slate-700">No activity logs recorded yet</div>
            <p className="text-xs text-slate-400">
              {search || userFilter !== "ALL" || actionFilter !== "ALL"
                ? "No actions match your active filters."
                : "Actions performed by users and admins will appear here chronologically."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#f0f8fa] text-[#0b252c] font-bold border-b border-[#cce7ed] uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3 w-14 text-center">Srno</th>
                  <th className="p-3 min-w-[150px]">Timestamp</th>
                  <th className="p-3 min-w-[160px]">Performed By</th>
                  <th className="p-3 min-w-[140px]">Action</th>
                  <th className="p-3 min-w-[120px]">Target SKU</th>
                  <th className="p-3 min-w-[160px]">Product</th>
                  <th className="p-3 min-w-[260px]">Action Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {logs.map((log, idx) => {
                  const actualSrno = (page - 1) * pageSize + idx + 1;
                  const badge = getActionBadge(log.action);
                  const dt = new Date(log.createdAt);
                  const formattedDate = dt.toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. Srno */}
                      <td className="p-3 text-center font-mono font-medium text-slate-500">
                        {actualSrno}
                      </td>

                      {/* 2. Timestamp */}
                      <td className="p-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formattedDate}</span>
                        </div>
                      </td>

                      {/* 3. Performed By */}
                      <td className="p-3 font-semibold text-[#0b252c]">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-[#e3f2f5] text-[#056468] flex items-center justify-center font-bold text-[10px] shrink-0 border border-[#cce7ed]">
                            {(log.performedBy || "A")[0].toUpperCase()}
                          </div>
                          <span className="truncate max-w-[150px]" title={log.performedBy}>
                            {log.performedBy || "Admin"}
                          </span>
                        </div>
                      </td>

                      {/* 4. Action */}
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${badge.bg}`}
                        >
                          {badge.icon}
                          <span>{log.action}</span>
                        </span>
                      </td>

                      {/* 5. Target SKU */}
                      <td className="p-3 font-mono text-[11.5px] font-bold text-[#056468]">
                        {log.sku || (log.entityId ? log.entityId.slice(0, 10) + "..." : "—")}
                      </td>

                      {/* 6. Product */}
                      <td className="p-3 font-medium text-slate-700">
                        <span className="truncate max-w-[180px] block" title={log.productName || "—"}>
                          {log.productName || "—"}
                        </span>
                      </td>

                      {/* 7. Action Details */}
                      <td className="p-3 text-slate-600 text-[11.5px] max-w-[340px]">
                        <span className="line-clamp-2" title={log.details || ""}>
                          {log.details || "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 border-t border-[#cce7ed] bg-white text-xs">
            <div className="text-slate-500 text-[11px]">
              Showing <strong className="text-slate-800">{(page - 1) * pageSize + 1}</strong> to{" "}
              <strong className="text-slate-800">{Math.min(page * pageSize, total)}</strong> of{" "}
              <strong className="text-slate-800">{total}</strong> activity events
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-[11px]">Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value, 10));
                  setPage(1);
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
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs font-semibold"
                >
                  Prev
                </button>
                <span className="px-2 font-mono text-[11px] text-slate-600">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs font-semibold"
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
