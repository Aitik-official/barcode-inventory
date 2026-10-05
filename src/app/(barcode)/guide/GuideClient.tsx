"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  HelpCircle,
  ScanBarcode,
  Printer,
  Boxes,
  CheckCircle2,
  Building2,
  Tag,
  Save,
  Sparkles,
  Layers,
  Store,
  ShieldCheck,
  Trash2,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  X,
  Server,
  KeyRound,
  FileText,
} from "lucide-react";

export default function GuideClient() {
  const [brandName, setBrandName] = useState("Micawas");
  const [sellerName, setSellerName] = useState("Micawas Enterprises");
  const [originText, setOriginText] = useState("Packed in India");
  const [defaultRoll, setDefaultRoll] = useState("50x50");
  const [savedFeedback, setSavedFeedback] = useState(false);

  // Reset Modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetAction, setResetAction] = useState<"CLEAR_TRANSACTIONS" | "FACTORY_RESET">("CLEAR_TRANSACTIONS");
  const [confirmInput, setConfirmInput] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    try {
      const savedBrand = localStorage.getItem("barcodezaa_default_brand");
      if (savedBrand) setBrandName(savedBrand);

      const savedSeller = localStorage.getItem("barcodezaa_default_seller");
      if (savedSeller) setSellerName(savedSeller);

      const savedOrigin = localStorage.getItem("barcodezaa_default_origin");
      if (savedOrigin) setOriginText(savedOrigin);

      const savedRoll = localStorage.getItem("barcodezaa_default_roll");
      if (savedRoll) setDefaultRoll(savedRoll);
    } catch {}
  }, []);

  const handleSaveBrandSettings = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem("barcodezaa_default_brand", brandName.trim());
      localStorage.setItem("barcodezaa_default_seller", sellerName.trim());
      localStorage.setItem("barcodezaa_default_origin", originText.trim());
      localStorage.setItem("barcodezaa_default_roll", defaultRoll);

      setSavedFeedback(true);
      setTimeout(() => setSavedFeedback(false), 4000);
    } catch {}
  };

  const handleExecuteReset = async () => {
    if (confirmInput.trim() !== "RESET") {
      alert('Please type "RESET" in uppercase to confirm.');
      return;
    }

    setResetLoading(true);
    setResetMessage(null);

    try {
      const res = await fetch("/api/admin/reset-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: resetAction,
          confirmText: confirmInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Reset failed");
      }

      setResetMessage({ text: data.message, type: "success" });
      setConfirmInput("");
      setTimeout(() => {
        setResetModalOpen(false);
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setResetMessage({ text: err.message, type: "error" });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-2">
      {/* Header */}
      <div className="border-b border-[#cce7ed] pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0b252c] flex items-center gap-2.5">
            <HelpCircle className="w-6 h-6 text-[#056468]" />
            <span>Platform Guide, Settings & Production Launch</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure global brand defaults, review production diagnostics, and purge demo data for live launch.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Production Ready</span>
          </span>
        </div>
      </div>

      {/* BRAND & THERMAL LABEL GLOBAL CONFIGURATION */}
      <div className="bg-white border-2 border-[#056468]/30 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#056468] text-white flex items-center justify-center shadow">
              <Tag className="w-4 h-4 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Default Brand & Thermal Label Settings</h2>
              <p className="text-xs text-slate-500">
                Change your default brand name here — automatically used on product creation and thermal labels.
              </p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-800">
            <Sparkles className="w-3 h-3 text-emerald-600" />
            <span>Auto Applied</span>
          </span>
        </div>

        <form onSubmit={handleSaveBrandSettings} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Default Brand Header on Barcode Stickers</label>
              <input
                type="text"
                required
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. Micawas"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#056468] focus:bg-white"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Printed at the top of 50×50mm & 50×30mm thermal rolls (e.g. <strong>{brandName || "Micawas"}</strong>).
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Default Seller / Business Name (Invoices)</label>
              <input
                type="text"
                required
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                placeholder="e.g. Micawas Enterprises"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#056468] focus:bg-white"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Used in Sold By header on 100×150mm Courier Shipping Labels & Tax Invoices.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Default Origin / Country Text</label>
              <input
                type="text"
                value={originText}
                onChange={(e) => setOriginText(e.target.value)}
                placeholder="Packed in India"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#056468] focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Preferred Thermal Label Roll Size</label>
              <select
                value={defaultRoll}
                onChange={(e) => setDefaultRoll(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#056468]"
              >
                <option value="50x50">50 × 50 mm — 1-Up Chromo Roll (Square Label)</option>
                <option value="50x30">50 × 30 mm — Standard Retail Tag</option>
                <option value="50x25">50 × 25 mm — Small Apparel Tag</option>
                <option value="75x50">75 × 50 mm — Warehouse / Shelf Tag</option>
                <option value="100x50">100 × 50 mm — Carton Box Tag</option>
                <option value="100x150">100 × 150 mm — 4×6" Parcel Courier Invoice</option>
              </select>
            </div>
          </div>

          {savedFeedback && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Default brand & sticker settings saved successfully! All labels and product forms will use these defaults.</span>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#056468] hover:bg-[#044e51] text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-98"
            >
              <Save className="w-4 h-4" />
              <span>Save Default Brand Settings</span>
            </button>
          </div>
        </form>
      </div>

      {/* PRODUCTION READINESS & FACTORY RESET CARD */}
      <div className="bg-white border-2 border-rose-200 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-200 shadow-2xs">
              <RotateCcw className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Production Launch & Demo Data Reset</h2>
              <p className="text-xs text-slate-500">
                Purge test orders, clear simulated transactions, or execute a factory reset to start real store inventory.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-[10px] font-bold text-rose-800 uppercase tracking-wider">
            Admin Only
          </span>
        </div>

        {/* System Diagnostics Checklist */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 text-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span><strong>Code 128 Sequential Engine:</strong> Active & Validated</span>
          </div>
          <div className="flex items-center gap-2 text-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span><strong>Session Security:</strong> 12-Hour Auto-Expiring JWT</span>
          </div>
          <div className="flex items-center gap-2 text-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span><strong>Multi-Channel SP-API:</strong> Production & Sandbox Ready</span>
          </div>
          <div className="flex items-center gap-2 text-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span><strong>Tax & Logistics:</strong> A4 GST & 100×150mm Label Output</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          <div>
            <span className="text-xs font-bold text-slate-800 block">Ready to go live?</span>
            <span className="text-[11px] text-slate-500">
              Clear mock orders and start with zero sales history or perform a full wipe.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setResetAction("CLEAR_TRANSACTIONS");
                setConfirmInput("");
                setResetMessage(null);
                setResetModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-300 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
              <span>Purge Demo Orders & Sales</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setResetAction("FACTORY_RESET");
                setConfirmInput("");
                setResetMessage(null);
                setResetModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Full Factory Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Guide Cards */}
      <div className="space-y-4 text-sm text-slate-700">
        <div className="bg-white border border-[#cce7ed] rounded-2xl p-6 shadow-sm space-y-3">
          <h2 className="text-base font-semibold text-[#056468] flex items-center gap-2">
            <Boxes className="w-5 h-5 text-[#056468]" />
            <span>1. How SKU vs Per-Unit Barcodes Work</span>
          </h2>
          <p className="text-xs leading-relaxed text-slate-600">
            In BarcodeZaa, products have a single, shared <strong>SKU</strong> for the product variant (e.g. <code className="bg-[#f2f9fa] border border-[#cce7ed] px-2 py-0.5 rounded text-[#056468] font-mono">ADL963</code>). However, <strong>every physical unit item in stock receives its own unique 12-digit Code 128 barcode string</strong> generated sequentially from a series (e.g. <code className="bg-[#f2f9fa] border border-[#cce7ed] px-2 py-0.5 rounded text-[#056468] font-mono">298505934915</code>, <code className="bg-[#f2f9fa] border border-[#cce7ed] px-2 py-0.5 rounded text-[#056468] font-mono">298505934916</code>, ...).
          </p>
          <ul className="list-disc list-inside text-xs space-y-1.5 text-slate-500">
            <li>Creating a product with initial stock = 10 generates 10 unique unit barcodes.</li>
            <li>On the printed sticker, the clean SKU is printed with the barcode Code 128, MRP, and Brand Header.</li>
            <li>Each unit barcode tracks its lifecycle status: <span className="text-emerald-700 font-medium">AVAILABLE</span> or <span className="text-purple-700 font-medium">SOLD</span>.</li>
          </ul>
        </div>

        <div className="bg-white border border-[#cce7ed] rounded-2xl p-6 shadow-sm space-y-3">
          <h2 className="text-base font-semibold text-emerald-800 flex items-center gap-2">
            <ScanBarcode className="w-5 h-5 text-emerald-700" />
            <span>2. Hardware USB Barcode Scanner & POS Checkout</span>
          </h2>
          <p className="text-xs leading-relaxed text-slate-600">
            Navigate to the <strong>Scan & POS</strong> tab (<Link href="/scan" className="text-[#056468] font-medium underline">/scan</Link>). Point your USB or Bluetooth barcode scanner at the thermal label on any physical unit item and pull the trigger.
          </p>
          <ul className="list-disc list-inside text-xs space-y-1.5 text-slate-500">
            <li>Select payment mode: <strong>Cash</strong>, <strong>UPI / QR</strong>, <strong>Card</strong>, <strong>Prepaid</strong>, or <strong>COD</strong>.</li>
            <li>Click <strong>Complete Sale</strong> to mark scanned barcodes as SOLD, update inventory, and instantly view/print the GST Tax Invoice!</li>
          </ul>
        </div>

        <div className="bg-white border border-[#cce7ed] rounded-2xl p-6 shadow-sm space-y-3">
          <h2 className="text-base font-semibold text-[#056468] flex items-center gap-2">
            <Printer className="w-5 h-5 text-[#056468]" />
            <span>3. Thermal Label Printing (Preset Sizes)</span>
          </h2>
          <p className="text-xs leading-relaxed text-slate-600">
            Click <strong>Thermal Label</strong> on any unit barcode in the <strong>Unit Barcodes</strong> tab or product detail page.
          </p>
          <ul className="list-disc list-inside text-xs space-y-1.5 text-slate-500">
            <li>Choose label roll size: <strong>50 × 50 mm</strong> (1-Up Chromo Roll), <strong>50 × 30 mm</strong> (Retail Standard), <strong>50 × 25 mm</strong> (Small Apparel Tag), <strong>75 × 50 mm</strong> (Shelf Bin Tag), or <strong>100 × 50 mm</strong> (Carton Tag).</li>
            <li>The print dialog automatically formats the sticker with your Brand Header, Product Name, SKU, Code 128 SVG, and MRP for crisp thermal printing.</li>
          </ul>
        </div>

        <div className="bg-white border border-[#cce7ed] rounded-2xl p-6 shadow-sm space-y-3">
          <h2 className="text-base font-semibold text-purple-800 flex items-center gap-2">
            <Store className="w-5 h-5 text-purple-700" />
            <span>4. Multi-Channel Batch Synchronization (Amazon & Flipkart)</span>
          </h2>
          <p className="text-xs leading-relaxed text-slate-600">
            In <strong>Channels</strong> (<Link href="/marketplaces" className="text-[#056468] font-medium underline">/marketplaces</Link>) and <strong>Orders</strong> (<Link href="/orders" className="text-[#056468] font-medium underline">/orders</Link>), you can filter orders by batches (<strong>All</strong>, <strong>Website</strong>, <strong>Amazon</strong>, <strong>Flipkart</strong>, <strong>POS Retail</strong>), batch-print courier shipping labels, and push live stock to marketplace channels.
          </p>
        </div>
      </div>

      {/* FACTORY RESET CONFIRMATION MODAL */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto pointer-events-auto">
          <div className="bg-white border-2 border-rose-300 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                </div>
                <h3 className="text-base font-bold text-rose-950">
                  {resetAction === "CLEAR_TRANSACTIONS" ? "Purge Demo Orders & Sales" : "Full Factory Reset"}
                </h3>
              </div>
              <button
                onClick={() => setResetModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              {resetAction === "CLEAR_TRANSACTIONS" ? (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2 text-amber-950">
                  <p className="font-bold">This action will permanently delete:</p>
                  <ul className="list-disc list-inside space-y-1 text-[11px]">
                    <li>All simulated customer orders & order line items</li>
                    <li>All generated tax invoices & B2B quotations</li>
                    <li>All POS sale transactions & courier parcel records</li>
                    <li>Reset all sold unit barcodes back to AVAILABLE in stock</li>
                  </ul>
                  <p className="text-[10px] text-amber-800 pt-1">
                    Your Products, SKUs, Brand Settings, and Superadmin accounts will be preserved.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-2 text-rose-950">
                  <p className="font-bold">⚠️ FULL FACTORY RESET (PRODUCTION LAUNCH):</p>
                  <p className="text-[11px]">
                    This will wipe <strong>ALL data</strong> across the system (products, barcodes, inventory, suppliers, customers, orders). The database will be left 100% clean so you can start fresh production inventory.
                  </p>
                  <p className="text-[10px] text-rose-800 font-bold pt-1">
                    Your superadmin login will remain active.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Type <span className="font-mono text-rose-700 font-black">RESET</span> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="RESET"
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 font-mono font-black text-center text-sm tracking-widest focus:outline-none focus:border-rose-600"
                />
              </div>

              {resetMessage && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold ${
                    resetMessage.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                      : "bg-rose-50 text-rose-800 border border-rose-300"
                  }`}
                >
                  {resetMessage.text}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResetModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReset}
                disabled={confirmInput.trim() !== "RESET" || resetLoading}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow transition-all disabled:opacity-40 cursor-pointer"
              >
                {resetLoading ? "Executing Reset..." : "Confirm & Execute Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
