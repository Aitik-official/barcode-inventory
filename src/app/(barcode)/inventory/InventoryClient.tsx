"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Boxes,
  History,
  FileSpreadsheet,
  Trash2,
  Plus,
  ChevronRight,
  Warehouse,
  Globe,
  Store,
  PackageCheck,
  Search,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function InventoryClient({
  inventories = [],
  transactions = [],
  purchaseOrders = [],
  wastes = [],
  suppliers = [],
  variants = [],
  marketplaceMappings = [],
}: {
  inventories: any[];
  transactions: any[];
  purchaseOrders: any[];
  wastes: any[];
  suppliers: any[];
  variants: any[];
  marketplaceMappings?: any[];
}) {
  const [activeTab, setActiveTab] = useState<"stock" | "ledger" | "po" | "waste">("stock");
  const [stockBatchFilter, setStockBatchFilter] = useState<"ALL" | "WEBSITE" | "AMAZON" | "FLIPKART">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [syncingVariantId, setSyncingVariantId] = useState<string | null>(null);

  // Create PO Modal State
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [poSupplierId, setPoSupplierId] = useState(suppliers[0]?.id || "");
  const [poAmount, setPoAmount] = useState("5000");
  const [poNotes, setPoNotes] = useState("");
  const [poLoading, setPoLoading] = useState(false);

  // Waste Modal State
  const [wasteModalOpen, setWasteModalOpen] = useState(false);
  const [wasteVariantId, setWasteVariantId] = useState(variants[0]?.id || inventories[0]?.productVariantId || "");
  const [wasteQty, setWasteQty] = useState(1);
  const [wasteReason, setWasteReason] = useState("DAMAGED");
  const [wasteDesc, setWasteDesc] = useState("");
  const [wasteLoading, setWasteLoading] = useState(false);

  // SKU to Marketplace Mappings Index
  const mappingsByVariantId = useMemo(() => {
    const map = new Map<string, { amazon?: any; flipkart?: any }>();
    marketplaceMappings.forEach((m) => {
      const entry = map.get(m.productVariantId) || {};
      if (m.channel === "AMAZON") {
        entry.amazon = m;
      } else if (m.channel === "FLIPKART") {
        entry.flipkart = m;
      }
      map.set(m.productVariantId, entry);
    });
    return map;
  }, [marketplaceMappings]);

  // Enriched Inventories
  const enrichedInventories = useMemo(() => {
    return inventories.map((inv) => {
      const mappings = mappingsByVariantId.get(inv.productVariantId) || {};
      const hasAmazon = !!mappings.amazon;
      const hasFlipkart = !!mappings.flipkart;
      const showOnWebsite = inv.productVariant?.product?.showOnWebsite !== false;

      return {
        ...inv,
        hasAmazon,
        hasFlipkart,
        showOnWebsite,
        amazonMapping: mappings.amazon,
        flipkartMapping: mappings.flipkart,
      };
    });
  }, [inventories, mappingsByVariantId]);

  // Filtered Stock by Batch & Search
  const filteredInventories = useMemo(() => {
    return enrichedInventories.filter((inv) => {
      if (stockBatchFilter === "WEBSITE" && !inv.showOnWebsite) return false;
      if (stockBatchFilter === "AMAZON" && !inv.hasAmazon) return false;
      if (stockBatchFilter === "FLIPKART" && !inv.hasFlipkart) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const pName = (inv.productVariant?.product?.name || "").toLowerCase();
        const sku = (inv.productVariant?.sku || "").toLowerCase();
        const asin = (inv.amazonMapping?.channelSku || "").toLowerCase();
        const fsn = (inv.flipkartMapping?.channelSku || "").toLowerCase();
        if (!pName.includes(q) && !sku.includes(q) && !asin.includes(q) && !fsn.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [enrichedInventories, stockBatchFilter, searchQuery]);

  // Inventory Batch Metrics
  const metrics = useMemo(() => {
    const totalUnits = inventories.reduce((acc, i) => acc + (i.quantity || 0), 0);
    const websiteItems = enrichedInventories.filter((i) => i.showOnWebsite).length;
    const amazonItems = enrichedInventories.filter((i) => i.hasAmazon).length;
    const flipkartItems = enrichedInventories.filter((i) => i.hasFlipkart).length;
    return {
      totalSkus: inventories.length,
      totalUnits,
      websiteItems,
      amazonItems,
      flipkartItems,
    };
  }, [inventories, enrichedInventories]);

  // Push stock to marketplaces
  const handlePushStock = async (productVariantId: string) => {
    setSyncingVariantId(productVariantId);
    try {
      const res = await fetch("/api/marketplaces/push-inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productVariantId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to push inventory");
      alert(data.message || "Stock level synchronized to Amazon & Flipkart!");
    } catch (err: any) {
      alert("Sync error: " + err.message);
    } finally {
      setSyncingVariantId(null);
    }
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetSupplierId = poSupplierId || suppliers[0]?.id;
    if (!targetSupplierId) {
      alert("Please add at least one supplier in Partners tab before creating a purchase order.");
      return;
    }

    setPoLoading(true);
    try {
      const res = await fetch("/api/inventory/po", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: targetSupplierId,
          totalAmount: poAmount,
          notes: poNotes,
          items: [{ sku: "STOCK-REFILL", name: "Bulk Stock Order", quantity: 20, unitPrice: 250 }],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create PO");
      }

      setPoModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPoLoading(false);
    }
  };

  const handleCreateWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetVariantId = wasteVariantId || variants[0]?.id || inventories[0]?.productVariantId;
    if (!targetVariantId) {
      alert("Please select a product variant first before recording write-off.");
      return;
    }

    setWasteLoading(true);
    try {
      const res = await fetch("/api/inventory/waste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productVariantId: targetVariantId,
          quantity: Number(wasteQty) || 1,
          reason: wasteReason,
          description: wasteDesc,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to write off waste");
      }

      setWasteModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setWasteLoading(false);
    }
  };

  return (
    <div className="space-y-6 py-2 text-[#0b252c]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#cce7ed] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0b252c] flex items-center gap-2.5">
            <Boxes className="w-6 h-6 text-[#056468]" />
            <span>Inventory & Multi-Channel Stock Ledger</span>
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Real-time warehouse stock balances, channel sync allocations (<strong>Website</strong>, <strong>Amazon SP-API</strong>, <strong>Flipkart</strong>), POs, and waste audits.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Write-off Waste Button */}
          <button
            type="button"
            onClick={() => {
              if (!wasteVariantId && (variants[0]?.id || inventories[0]?.productVariantId)) {
                setWasteVariantId(variants[0]?.id || inventories[0]?.productVariantId);
              }
              setWasteModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200 hover:border-rose-300 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Write-off Waste</span>
          </button>

          {/* Create Purchase Order Button */}
          <button
            type="button"
            onClick={() => {
              if (!poSupplierId && suppliers[0]?.id) {
                setPoSupplierId(suppliers[0]?.id);
              }
              setPoModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#056468] hover:bg-[#044e51] text-white font-bold text-xs shadow transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Purchase Order</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-[#cce7ed] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("stock")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "stock"
              ? "bg-[#056468] text-white shadow-sm"
              : "text-slate-600 hover:text-[#0b252c] hover:bg-white/60"
          }`}
        >
          <Warehouse className="w-3.5 h-3.5" />
          <span>Warehouse Stock ({inventories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("ledger")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "ledger"
              ? "bg-[#056468] text-white shadow-sm"
              : "text-slate-600 hover:text-[#0b252c] hover:bg-white/60"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Audit Ledger ({transactions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("po")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "po"
              ? "bg-[#056468] text-white shadow-sm"
              : "text-slate-600 hover:text-[#0b252c] hover:bg-white/60"
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Purchase Orders ({purchaseOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("waste")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "waste"
              ? "bg-[#056468] text-white shadow-sm"
              : "text-slate-600 hover:text-[#0b252c] hover:bg-white/60"
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Write-offs ({wastes.length})</span>
        </button>
      </div>

      {/* TAB 1: WAREHOUSE STOCK & CHANNEL BATCHES */}
      {activeTab === "stock" && (
        <div className="space-y-4">
          {/* Metric Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              onClick={() => setStockBatchFilter("ALL")}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                stockBatchFilter === "ALL"
                  ? "bg-white border-[#056468] shadow-md ring-2 ring-[#056468]/20"
                  : "bg-white/80 border-slate-200 hover:bg-white"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                <span>All SKUs</span>
                <Boxes className="w-4 h-4 text-[#056468]" />
              </div>
              <div className="text-xl font-extrabold text-slate-900">{metrics.totalSkus} SKUs</div>
              <div className="text-[11px] font-bold text-emerald-700 mt-0.5">
                {metrics.totalUnits} Total Units In Stock
              </div>
            </div>

            <div
              onClick={() => setStockBatchFilter("WEBSITE")}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                stockBatchFilter === "WEBSITE"
                  ? "bg-white border-emerald-600 shadow-md ring-2 ring-emerald-600/20"
                  : "bg-white/80 border-slate-200 hover:bg-white"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold mb-1">
                <span className="flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-emerald-600" />
                  Website Catalog
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Live</span>
              </div>
              <div className="text-xl font-extrabold text-slate-900">{metrics.websiteItems} SKUs</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Published to Storefront</div>
            </div>

            <div
              onClick={() => setStockBatchFilter("AMAZON")}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                stockBatchFilter === "AMAZON"
                  ? "bg-white border-amber-500 shadow-md ring-2 ring-amber-500/20"
                  : "bg-white/80 border-slate-200 hover:bg-white"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-amber-800 font-semibold mb-1">
                <span className="flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-amber-600" />
                  Amazon SP-API
                </span>
                <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold">Synced</span>
              </div>
              <div className="text-xl font-extrabold text-slate-900">{metrics.amazonItems} SKUs</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Mapped ASINs</div>
            </div>

            <div
              onClick={() => setStockBatchFilter("FLIPKART")}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                stockBatchFilter === "FLIPKART"
                  ? "bg-white border-blue-500 shadow-md ring-2 ring-blue-500/20"
                  : "bg-white/80 border-slate-200 hover:bg-white"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-blue-800 font-semibold mb-1">
                <span className="flex items-center gap-1">
                  <PackageCheck className="w-3.5 h-3.5 text-blue-600" />
                  Flipkart Market
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded font-bold">Synced</span>
              </div>
              <div className="text-xl font-extrabold text-slate-900">{metrics.flipkartItems} SKUs</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Mapped FSNs</div>
            </div>
          </div>

          {/* Stock Table Card */}
          <div className="bg-white border border-[#cce7ed] rounded-2xl p-5 shadow-sm space-y-4">
            {/* Filter Pills & Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">Filter:</span>
                {[
                  { key: "ALL", label: `All Stock Batches (${enrichedInventories.length})` },
                  { key: "WEBSITE", label: `Website Catalog (${metrics.websiteItems})` },
                  { key: "AMAZON", label: `Amazon Synced (${metrics.amazonItems})` },
                  { key: "FLIPKART", label: `Flipkart Synced (${metrics.flipkartItems})` },
                ].map((b) => (
                  <button
                    key={b.key}
                    onClick={() => setStockBatchFilter(b.key as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      stockBatchFilter === b.key
                        ? "bg-[#056468] text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              <div className="relative sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Product, SKU, ASIN..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#056468]"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-[#cce7ed]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f0f8fa] text-[#0b252c] font-semibold uppercase tracking-wider border-b border-[#cce7ed]">
                  <tr>
                    <th className="p-3">Product Name & Variant</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Channel Sync Allocation</th>
                    <th className="p-3">Physical Unit Barcodes</th>
                    <th className="p-3">Selling Price</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#cce7ed] font-normal text-[#0b252c]">
                  {filteredInventories.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No inventory matching current batch filter (<strong>{stockBatchFilter}</strong>).
                      </td>
                    </tr>
                  ) : (
                    filteredInventories.map((inv) => (
                      <tr key={inv.id} className="hover:bg-[#f8fcfe] transition-colors">
                        {/* Product Name */}
                        <td className="p-3">
                          <Link
                            href={`/products/${inv.productVariant?.productId}`}
                            className="font-bold text-[#0b252c] hover:text-[#056468] hover:underline block"
                          >
                            {inv.productVariant?.product?.name}
                          </Link>
                          <span className="text-[11px] text-slate-500">
                            {inv.productVariant?.color || "Standard"} • {inv.productVariant?.size || "Default Size"}
                          </span>
                        </td>

                        {/* SKU */}
                        <td className="p-3">
                          <span className="text-[#056468] font-mono font-bold text-xs bg-[#e3f2f5] px-2 py-0.5 rounded border border-[#b2dce5]">
                            {inv.productVariant?.sku}
                          </span>
                        </td>

                        {/* Channel Sync Allocations */}
                        <td className="p-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* Website Tag */}
                            {inv.showOnWebsite ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                                <Globe className="w-3 h-3 text-emerald-600" />
                                <span>Website</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Offline</span>
                            )}

                            {/* Amazon Tag */}
                            {inv.hasAmazon ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300" title={`Amazon ASIN: ${inv.amazonMapping?.channelSku}`}>
                                <Store className="w-3 h-3 text-amber-600" />
                                <span>Amazon: {inv.amazonMapping?.channelSku}</span>
                              </span>
                            ) : (
                              <Link
                                href="/marketplaces"
                                className="text-[10px] text-slate-400 hover:text-amber-700 underline"
                              >
                                + Link Amazon
                              </Link>
                            )}

                            {/* Flipkart Tag */}
                            {inv.hasFlipkart ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-300" title={`Flipkart FSN: ${inv.flipkartMapping?.channelSku}`}>
                                <PackageCheck className="w-3 h-3 text-blue-600" />
                                <span>Flipkart: {inv.flipkartMapping?.channelSku}</span>
                              </span>
                            ) : (
                              <Link
                                href="/marketplaces"
                                className="text-[10px] text-slate-400 hover:text-blue-700 underline"
                              >
                                + Link Flipkart
                              </Link>
                            )}
                          </div>
                        </td>

                        {/* Available Unit Barcodes */}
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${
                                inv.quantity > 5
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                                  : inv.quantity > 0
                                  ? "bg-amber-50 text-amber-800 border border-amber-300"
                                  : "bg-rose-50 text-rose-800 border border-rose-300"
                              }`}
                            >
                              {inv.quantity} Units Available
                            </span>
                          </div>
                        </td>

                        {/* Price */}
                        <td className="p-3 font-semibold text-[#0b252c]">
                          ₹{(inv.productVariant?.sellingPrice || inv.productVariant?.product?.offerPrice || 0).toFixed(2)}
                        </td>

                        {/* Actions */}
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {(inv.hasAmazon || inv.hasFlipkart) && (
                              <button
                                onClick={() => handlePushStock(inv.productVariantId)}
                                disabled={syncingVariantId === inv.productVariantId}
                                className="px-2.5 py-1 bg-white hover:bg-[#e3f2f5] text-[#056468] font-bold text-[11px] rounded-lg border border-[#056468] shadow-2xs flex items-center gap-1 transition-all"
                                title="Push real-time unit stock balance to Amazon SP-API and Flipkart Marketplace"
                              >
                                <RefreshCw className={`w-3 h-3 ${syncingVariantId === inv.productVariantId ? "animate-spin" : ""}`} />
                                <span>{syncingVariantId === inv.productVariantId ? "Pushing..." : "Sync Stock"}</span>
                              </button>
                            )}

                            <Link
                              href={`/products/${inv.productVariant?.productId}`}
                              className="px-2.5 py-1 bg-[#056468] hover:bg-[#044e51] text-white font-medium text-[11px] rounded-lg shadow-2xs inline-flex items-center gap-1"
                            >
                              <span>Manage</span>
                              <ChevronRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT LEDGER */}
      {activeTab === "ledger" && (
        <div className="bg-white border border-[#cce7ed] rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-[#0b252c] flex items-center gap-1.5">
            <History className="w-4 h-4 text-[#056468]" />
            <span>Stock & Barcode Audit Ledger</span>
          </h2>

          <div className="overflow-x-auto rounded-lg border border-[#cce7ed]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f0f8fa] text-[#0b252c] font-semibold uppercase tracking-wider border-b border-[#cce7ed]">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Product / SKU</th>
                  <th className="p-3">Unit Barcode</th>
                  <th className="p-3">Transaction Type</th>
                  <th className="p-3">Qty</th>
                  <th className="p-3">Stock Balance</th>
                  <th className="p-3">Channel / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#cce7ed] font-normal text-[#0b252c]">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#f8fcfe]">
                    <td className="p-3 text-[#5f818b] text-[11px]">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <span className="font-semibold text-[#0b252c] block">{tx.productVariant?.product?.name}</span>
                      <span className="text-[#5f818b] font-mono text-[11px]">{tx.productVariant?.sku}</span>
                    </td>
                    <td className="p-3 font-mono">
                      {tx.unitBarcode ? (
                        <span className="bg-[#e3f2f5] border border-[#b2dce5] text-[#056468] px-2 py-0.5 rounded font-semibold text-[11px]">
                          {tx.unitBarcode.barcode}
                        </span>
                      ) : (
                        <span className="text-[#89a8b1]">-</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          tx.transactionType === "RECEIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : tx.transactionType === "SALE"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {tx.transactionType}
                      </span>
                    </td>
                    <td className="p-3 font-bold">
                      {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                    </td>
                    <td className="p-3 font-bold text-[#056468]">{tx.newStock} Units</td>
                    <td className="p-3 text-[#4a6870] max-w-xs truncate">{tx.note || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PO */}
      {activeTab === "po" && (
        <div className="bg-white border border-[#cce7ed] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#cce7ed] pb-3">
            <h2 className="text-sm font-semibold text-[#0b252c] flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-[#056468]" />
              <span>Purchase Orders (PO)</span>
            </h2>
            <button
              type="button"
              onClick={() => {
                if (!poSupplierId && suppliers[0]?.id) {
                  setPoSupplierId(suppliers[0]?.id);
                }
                setPoModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-[#056468] hover:bg-[#044e51] text-white font-bold text-xs rounded-lg shadow-sm cursor-pointer"
            >
              + Create PO
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#cce7ed]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f0f8fa] text-[#0b252c] font-semibold uppercase tracking-wider border-b border-[#cce7ed]">
                <tr>
                  <th className="p-3">PO #</th>
                  <th className="p-3">Supplier Name</th>
                  <th className="p-3">Total Amount</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Order Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#cce7ed] font-normal text-[#0b252c]">
                {purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[#5f818b]">
                      No purchase orders recorded.
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-[#f8fcfe]">
                      <td className="p-3 font-mono font-semibold text-[#056468]">{po.poNumber}</td>
                      <td className="p-3 font-semibold text-[#0b252c]">{po.supplier?.name}</td>
                      <td className="p-3 font-bold text-[#056468]">₹{po.totalAmount.toFixed(2)}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#e3f2f5] text-[#056468] border border-[#b2dce5]">
                          {po.status}
                        </span>
                      </td>
                      <td className="p-3 text-[#5f818b]">
                        {new Date(po.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: WASTE */}
      {activeTab === "waste" && (
        <div className="bg-white border border-[#cce7ed] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#cce7ed] pb-3">
            <h2 className="text-sm font-semibold text-[#0b252c] flex items-center gap-1.5">
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Stock Write-offs & Waste Logs</span>
            </h2>
            <button
              type="button"
              onClick={() => {
                if (!wasteVariantId && (variants[0]?.id || inventories[0]?.productVariantId)) {
                  setWasteVariantId(variants[0]?.id || inventories[0]?.productVariantId);
                }
                setWasteModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm cursor-pointer"
            >
              + Write-off Waste
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#cce7ed]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f0f8fa] text-[#0b252c] font-semibold uppercase tracking-wider border-b border-[#cce7ed]">
                <tr>
                  <th className="p-3">Product Name</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3">Quantity</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#cce7ed] font-normal text-[#0b252c]">
                {wastes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[#5f818b]">
                      No stock write-offs recorded.
                    </td>
                  </tr>
                ) : (
                  wastes.map((w) => (
                    <tr key={w.id} className="hover:bg-[#f8fcfe]">
                      <td className="p-3 font-semibold text-[#0b252c]">
                        {w.productVariant?.product?.name}
                      </td>
                      <td className="p-3 text-[#5f818b] font-mono text-[11px]">{w.productVariant?.sku}</td>
                      <td className="p-3 font-bold text-rose-600">{w.quantity} Units</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          {w.reason}
                        </span>
                      </td>
                      <td className="p-3 text-[#5f818b]">
                        {new Date(w.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create PO Modal */}
      {poModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-[#cce7ed] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-[#0b252c] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#0b252c] flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#056468]" />
                <span>Create Purchase Order</span>
              </h3>
              <button
                type="button"
                onClick={() => setPoModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#0b252c] mb-1">Select Supplier</label>
                {suppliers.length === 0 ? (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                    No suppliers found. Please add a supplier under the Partners tab first.
                  </div>
                ) : (
                  <select
                    required
                    value={poSupplierId || suppliers[0]?.id || ""}
                    onChange={(e) => setPoSupplierId(e.target.value)}
                    className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-xl px-3 py-2 text-[#0b252c] text-xs font-medium focus:ring-2 focus:ring-[#056468]"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.city || "Direct Supplier"})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block font-bold text-[#0b252c] mb-1">Total Order Value (₹)</label>
                <input
                  type="number"
                  required
                  value={poAmount}
                  onChange={(e) => setPoAmount(e.target.value)}
                  className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-xl px-3 py-2 text-[#0b252c] font-mono font-bold text-sm focus:ring-2 focus:ring-[#056468]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0b252c] mb-1">Notes / Specifications</label>
                <textarea
                  rows={2}
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  placeholder="Delivery terms, batch details, expected shipping dates..."
                  className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-xl px-3 py-2 text-[#0b252c] text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#cce7ed]">
                <button
                  type="button"
                  onClick={() => setPoModalOpen(false)}
                  className="px-4 py-2 font-semibold text-[#4a6870] hover:text-[#0b252c] text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={poLoading || suppliers.length === 0}
                  className="px-5 py-2.5 bg-[#056468] hover:bg-[#044e51] text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {poLoading ? "Creating..." : "Issue Purchase Order"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Waste Write-off Modal */}
      {wasteModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-[#cce7ed] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-[#0b252c] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#0b252c] flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <span>Write-off Damaged Stock</span>
              </h3>
              <button
                type="button"
                onClick={() => setWasteModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWaste} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#0b252c] mb-1">Select Product Variant</label>
                {variants.length === 0 && inventories.length === 0 ? (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                    No products available in catalog.
                  </div>
                ) : (
                  <select
                    required
                    value={wasteVariantId || variants[0]?.id || inventories[0]?.productVariantId || ""}
                    onChange={(e) => setWasteVariantId(e.target.value)}
                    className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-xl px-3 py-2 text-[#0b252c] text-xs font-medium focus:ring-2 focus:ring-rose-500"
                  >
                    {variants.length > 0 ? (
                      variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.product?.name} ({v.sku})
                        </option>
                      ))
                    ) : (
                      inventories.map((i) => (
                        <option key={i.productVariantId} value={i.productVariantId}>
                          {i.productVariant?.product?.name} ({i.productVariant?.sku})
                        </option>
                      ))
                    )}
                  </select>
                )}
              </div>

              <div>
                <label className="block font-bold text-[#0b252c] mb-1">Quantity Damaged (Units)</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  required
                  value={wasteQty}
                  onChange={(e) => setWasteQty(parseInt(e.target.value) || 1)}
                  className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-xl px-3 py-2 text-[#0b252c] font-mono font-bold text-sm focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0b252c] mb-1">Reason for Write-off</label>
                <select
                  value={wasteReason}
                  onChange={(e) => setWasteReason(e.target.value)}
                  className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-xl px-3 py-2 text-[#0b252c] text-xs font-medium"
                >
                  <option value="DAMAGED">Damaged in Storage / Roll Crushed</option>
                  <option value="PRINT_TEST_FAIL">Thermal Print Test Bleed / Defect</option>
                  <option value="EXPIRED">Adhesive Expired</option>
                  <option value="LOST">Lost Count / Discrepancy</option>
                  <option value="CUSTOMER_RETURN_DAMAGED">Courier Return Damaged</option>
                  <option value="OTHER">Other Reason</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#0b252c] mb-1">Audit Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={wasteDesc}
                  onChange={(e) => setWasteDesc(e.target.value)}
                  placeholder="Explain cause of damage or batch reference..."
                  className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-xl px-3 py-2 text-[#0b252c] text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#cce7ed]">
                <button
                  type="button"
                  onClick={() => setWasteModalOpen(false)}
                  className="px-4 py-2 font-semibold text-[#4a6870] hover:text-[#0b252c] text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={wasteLoading}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {wasteLoading ? "Recording..." : "Confirm & Write-off Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
