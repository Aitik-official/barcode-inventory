"use client";

import { useState, useRef, useEffect } from "react";
import {
  X,
  PackagePlus,
  ScanBarcode,
  Plus,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ClipboardList,
  Sparkles,
} from "lucide-react";

interface ScannedItem {
  barcode: string;
  sku: string;
  productName: string;
  serialNumber: number;
  price: number;
  productVariantId: string;
}

interface BulkFbaTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTally?: () => void;
}

const DEFAULT_DIVISIONS = ["Amazon", "Flipkart", "Meesho", "Blinkit"];

export function BulkFbaTransferModal({
  isOpen,
  onClose,
  onOpenTally,
}: BulkFbaTransferModalProps) {
  const [divisions, setDivisions] = useState<string[]>(DEFAULT_DIVISIONS);
  const [activeDivision, setActiveDivision] = useState<string>("Amazon");
  const [showAddDivision, setShowAddDivision] = useState(false);
  const [newDivisionInput, setNewDivisionInput] = useState("");

  const [scanInput, setScanInput] = useState("");
  const [pasteInput, setPasteInput] = useState("");
  const [showPasteBox, setShowPasteBox] = useState(false);

  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<any | null>(null);

  const scanInputRef = useRef<HTMLInputElement>(null);

  // Load custom divisions from localStorage or API
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("fba_custom_divisions");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDivisions(Array.from(new Set([...DEFAULT_DIVISIONS, ...parsed])));
          }
        }
      } catch (e) {
        console.error("Error reading divisions from storage", e);
      }
    }
  }, []);

  // Fetch available divisions from backend transfers too
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessInfo(null);
      setTimeout(() => scanInputRef.current?.focus(), 150);

      fetch("/api/fba/transfer")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data.availableDivisions) && data.availableDivisions.length > 0) {
            setDivisions((prev) =>
              Array.from(new Set([...prev, ...data.availableDivisions]))
            );
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddNewDivision = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newDivisionInput.trim();
    if (!clean) return;

    if (!divisions.includes(clean)) {
      const updated = [...divisions, clean];
      setDivisions(updated);
      try {
        localStorage.setItem("fba_custom_divisions", JSON.stringify(updated));
      } catch {}
    }
    setActiveDivision(clean);
    setNewDivisionInput("");
    setShowAddDivision(false);
  };

  const handleSingleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const barcode = scanInput.trim();
    if (!barcode) return;

    // Check duplicate in current batch
    if (scannedItems.some((item) => item.barcode === barcode)) {
      setError(`Barcode ${barcode} already added in current batch.`);
      setScanInput("");
      return;
    }

    setLookupLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/barcodes/lookup?q=${encodeURIComponent(barcode)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Barcode ${barcode} not found.`);
      }

      if (data.type !== "UNIT_BARCODE") {
        throw new Error(`Found SKU "${data.sku}". Please scan physical unit barcode.`);
      }

      if (data.unitStatus !== "AVAILABLE") {
        throw new Error(
          `Unit barcode ${barcode} cannot be transferred. Current status: ${data.unitStatus}`
        );
      }

      const newItem: ScannedItem = {
        barcode: data.unitBarcode,
        sku: data.sku,
        productName: data.productName,
        serialNumber: data.serialNumber || 1,
        price: data.price || 0,
        productVariantId: data.match?.productVariantId || "",
      };

      setScannedItems((prev) => [newItem, ...prev]);
      setScanInput("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLookupLoading(false);
      scanInputRef.current?.focus();
    }
  };

  const handleBulkPasteAdd = async () => {
    if (!pasteInput.trim()) return;

    const barcodes = Array.from(
      new Set(
        pasteInput
          .split(/[\n,; \t]+/)
          .map((b) => b.trim())
          .filter((b) => b.length > 0)
      )
    );

    if (barcodes.length === 0) return;

    setLookupLoading(true);
    setError(null);

    const added: ScannedItem[] = [];
    const errors: string[] = [];

    for (const barcode of barcodes) {
      if (scannedItems.some((item) => item.barcode === barcode)) continue;

      try {
        const res = await fetch(`/api/barcodes/lookup?q=${encodeURIComponent(barcode)}`);
        const data = await res.json();
        if (res.ok && data.type === "UNIT_BARCODE" && data.unitStatus === "AVAILABLE") {
          added.push({
            barcode: data.unitBarcode,
            sku: data.sku,
            productName: data.productName,
            serialNumber: data.serialNumber || 1,
            price: data.price || 0,
            productVariantId: data.match?.productVariantId || "",
          });
        } else {
          errors.push(barcode);
        }
      } catch {
        errors.push(barcode);
      }
    }

    if (added.length > 0) {
      setScannedItems((prev) => [...added, ...prev]);
      setPasteInput("");
      setShowPasteBox(false);
    }

    if (errors.length > 0) {
      setError(
        `Added ${added.length} units. ${errors.length} skipped (not found or not available): ${errors.slice(0, 3).join(", ")}`
      );
    }

    setLookupLoading(false);
  };

  const handleRemoveItem = (index: number) => {
    setScannedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmTransfer = async () => {
    if (scannedItems.length === 0) {
      setError("Please scan at least one unit barcode before saving.");
      return;
    }

    setTransferLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/fba/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          division: activeDivision,
          channel: activeDivision,
          barcodes: scannedItems.map((item) => item.barcode),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to transfer to FBA.");

      setSuccessInfo(data);
      setScannedItems([]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTransferLoading(false);
    }
  };

  const totalValue = scannedItems.reduce((acc, curr) => acc + (curr.price || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-[#cce7ed] rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#0b252c] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30">
              <PackagePlus className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold">
                Bulk Scan Units into FBA Stock
              </h3>
              <p className="text-xs text-slate-300">
                Select division (Amazon, Flipkart, or custom), scan physical barcodes, and keep them in FBA.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {successInfo ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-[#0b252c]">
                  Units Successfully Added to {activeDivision} FBA!
                </h4>
                <p className="text-sm text-slate-600 mt-1">
                  {successInfo.message}
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setSuccessInfo(null);
                    setScannedItems([]);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Scan More Units
                </button>
                {onOpenTally && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenTally();
                    }}
                    className="px-5 py-2.5 bg-[#056468] hover:bg-[#044e51] text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <ClipboardList className="w-4 h-4" />
                    <span>Open Units & Mark Status</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* 1. Division Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <span>1. Select Division / Marketplace</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddDivision(!showAddDivision)}
                    className="text-xs text-[#056468] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add More Division</span>
                  </button>
                </div>

                {/* Division Chips */}
                <div className="flex flex-wrap gap-2">
                  {divisions.map((div) => {
                    const isSelected = activeDivision.toLowerCase() === div.toLowerCase();
                    return (
                      <button
                        key={div}
                        type="button"
                        onClick={() => setActiveDivision(div)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-amber-500 text-white border-amber-600 shadow-sm scale-102"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300"
                        }`}
                      >
                        {div}
                      </button>
                    );
                  })}
                </div>

                {/* Inline Add Division Form */}
                {showAddDivision && (
                  <form
                    onSubmit={handleAddNewDivision}
                    className="flex gap-2 pt-1 animate-in fade-in"
                  >
                    <input
                      type="text"
                      value={newDivisionInput}
                      onChange={(e) => setNewDivisionInput(e.target.value)}
                      placeholder="Enter new division name (e.g. Myntra, Zepto, Amazon BOM5)..."
                      className="flex-1 text-xs px-3 py-2 border-2 border-[#056468] rounded-xl focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#056468] hover:bg-[#044e51] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      Save Division
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddDivision(false)}
                      className="px-3 py-2 text-xs text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                  </form>
                )}
              </div>

              {/* 2. Barcode Scanning */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#056468] uppercase tracking-wider flex items-center gap-1.5">
                    <ScanBarcode className="w-4 h-4" />
                    <span>2. Scan Barcodes into {activeDivision}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPasteBox(!showPasteBox)}
                    className="text-xs text-[#056468] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showPasteBox ? "Hide Paste Box" : "📋 Paste Multiple"}</span>
                  </button>
                </div>

                {showPasteBox ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                    <p className="text-xs text-amber-900 font-medium">
                      Paste barcodes separated by commas or newlines:
                    </p>
                    <textarea
                      value={pasteInput}
                      onChange={(e) => setPasteInput(e.target.value)}
                      placeholder="299420114239&#10;299420114240"
                      rows={3}
                      className="w-full text-xs font-mono p-2 border border-amber-300 rounded-lg bg-white focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPasteBox(false)}
                        className="px-3 py-1.5 text-xs text-slate-600"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleBulkPasteAdd}
                        disabled={lookupLoading}
                        className="px-4 py-1.5 bg-[#056468] text-white text-xs font-bold rounded-lg cursor-pointer"
                      >
                        {lookupLoading ? "Validating..." : "Add All Scanned"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSingleScan} className="flex gap-2">
                    <input
                      ref={scanInputRef}
                      type="text"
                      value={scanInput}
                      onChange={(e) => setScanInput(e.target.value)}
                      placeholder={`Scan unit barcode for ${activeDivision} (point USB scanner)...`}
                      className="flex-1 bg-slate-50 border-2 border-[#056468] rounded-xl px-4 py-2.5 text-base font-mono font-bold text-[#0b252c] placeholder-slate-400 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={lookupLoading}
                      className="px-5 py-2.5 bg-[#056468] hover:bg-[#044e51] text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <ScanBarcode className="w-4 h-4" />
                      {lookupLoading ? "Adding..." : "Add Unit"}
                    </button>
                  </form>
                )}

                {error && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      {error}
                    </span>
                    <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800">
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Scanned Units List */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                  <div className="flex items-center gap-2">
                    <span>Units to Add ({scannedItems.length})</span>
                    {scannedItems.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                        ₹{totalValue.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                  {scannedItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setScannedItems([])}
                      className="text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear
                    </button>
                  )}
                </div>

                <div className="max-h-52 overflow-y-auto divide-y divide-slate-100">
                  {scannedItems.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Scan physical barcodes using your scanner or paste a list above.
                    </div>
                  ) : (
                    scannedItems.map((item, idx) => (
                      <div
                        key={`${item.barcode}-${idx}`}
                        className="px-4 py-2 flex items-center justify-between hover:bg-slate-50 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-5 text-slate-400 font-mono text-[11px]">#{idx + 1}</span>
                          <div>
                            <div className="font-bold text-[#0b252c]">{item.productName}</div>
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                              <span>SKU: <strong className="text-slate-700">{item.sku}</strong></span>
                              <span>•</span>
                              <span>Barcode: <strong className="text-[#056468]">{item.barcode}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-bold font-mono text-slate-700">
                            ₹{item.price.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!successInfo && (
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Adding under division: <strong className="text-[#0b252c] font-bold">{activeDivision}</strong>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTransfer}
                disabled={transferLoading || scannedItems.length === 0}
                className="px-6 py-2.5 bg-[#056468] hover:bg-[#044e51] text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
              >
                <PackagePlus className="w-4 h-4" />
                <span>
                  {transferLoading
                    ? "Adding..."
                    : `Inward ${scannedItems.length} Units to ${activeDivision} FBA`}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
