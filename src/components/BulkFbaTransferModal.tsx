"use client";

import { useState, useRef, useEffect } from "react";
import {
  X,
  PackagePlus,
  ScanBarcode,
  Truck,
  Building2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Layers,
  ArrowRight,
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

const FC_PRESETS = [
  "Amazon FC BOM5 (Bhiwandi, MH)",
  "Amazon FC DEL4 (Gurugram, HR)",
  "Amazon FC BLR1 (Bengaluru, KA)",
  "Flipkart FC BLR1 (Malur, KA)",
  "Flipkart FC DEL1 (Farukhnagar, HR)",
  "Flipkart FC BOM1 (Bhiwandi, MH)",
  "Delhivery 3PL Fulfillment Center",
];

export function BulkFbaTransferModal({
  isOpen,
  onClose,
  onOpenTally,
}: BulkFbaTransferModalProps) {
  const [channel, setChannel] = useState<"AMAZON_FBA" | "FLIPKART_FBF" | "MEESHO_3PL" | "OTHER_3PL">("AMAZON_FBA");
  const [destinationFc, setDestinationFc] = useState("Amazon FC BOM5 (Bhiwandi, MH)");
  const [shipmentNumber, setShipmentNumber] = useState("");
  const [trackingId, setTrackingId] = useState("");
  const [courier, setCourier] = useState("Amazon ATS");
  const [notes, setNotes] = useState("");

  const [scanInput, setScanInput] = useState("");
  const [pasteInput, setPasteInput] = useState("");
  const [showPasteBox, setShowPasteBox] = useState(false);

  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<any | null>(null);

  const scanInputRef = useRef<HTMLInputElement>(null);

  // Generate default shipment number when opened
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessInfo(null);
      const prefix = channel === "AMAZON_FBA" ? "FBA-AMZ" : channel === "FLIPKART_FBF" ? "FBF-FLP" : "FBA-3PL";
      const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const rand = Math.floor(1000 + Math.random() * 9000);
      setShipmentNumber(`${prefix}-${d}-${rand}`);
      setTimeout(() => {
        scanInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, channel]);

  if (!isOpen) return null;

  const handleChannelSelect = (newChannel: "AMAZON_FBA" | "FLIPKART_FBF" | "MEESHO_3PL" | "OTHER_3PL") => {
    setChannel(newChannel);
    if (newChannel === "AMAZON_FBA") {
      setDestinationFc("Amazon FC BOM5 (Bhiwandi, MH)");
      setCourier("Amazon ATS");
    } else if (newChannel === "FLIPKART_FBF") {
      setDestinationFc("Flipkart FC BLR1 (Malur, KA)");
      setCourier("Ekart Logistics");
    } else {
      setDestinationFc("3PL Fulfillment Center");
      setCourier("Surface Logistics");
    }
  };

  const handleSingleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const barcode = scanInput.trim();
    if (!barcode) return;

    // Check duplicate in current batch
    if (scannedItems.some((item) => item.barcode === barcode)) {
      setError(`Barcode ${barcode} is already added in this transfer batch.`);
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
        throw new Error(
          `Please scan physical unit item barcode. Found SKU ${data.sku} instead.`
        );
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
      if (scannedItems.some((item) => item.barcode === barcode)) {
        continue; // skip duplicate in batch
      }

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
        `Added ${added.length} units. ${errors.length} barcode(s) skipped (not found or not available): ${errors.slice(0, 3).join(", ")}${errors.length > 3 ? "..." : ""}`
      );
    }

    setLookupLoading(false);
  };

  const handleRemoveItem = (index: number) => {
    setScannedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmTransfer = async () => {
    if (scannedItems.length === 0) {
      setError("Please scan at least one unit barcode before transferring.");
      return;
    }

    setTransferLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/fba/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel,
          destinationFc,
          shipmentNumber,
          trackingId,
          courier,
          notes,
          barcodes: scannedItems.map((item) => item.barcode),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to transfer to FBA.");
      }

      setSuccessInfo(data);
      setScannedItems([]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTransferLoading(false);
    }
  };

  const totalValue = scannedItems.reduce((acc, curr) => acc + (curr.price || 0), 0);
  const distinctSkus = Array.from(new Set(scannedItems.map((i) => i.sku))).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-[#cce7ed] rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#0b252c] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30">
              <PackagePlus className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span>Bulk Scan & Transfer to FBA / Marketplace Warehouse</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Units Kept at FBA
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Scan multiple unit barcodes in bulk. They are moved into FBA inventory as units kept there for monthly sales tally.
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
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {successInfo ? (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-[#0b252c]">
                  Stock Successfully Transferred to FBA!
                </h4>
                <p className="text-sm text-slate-600 mt-1">
                  {successInfo.message}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md mx-auto text-left text-xs space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Shipment Code:</span>
                  <span className="font-bold text-[#0b252c]">{successInfo.transfer?.shipmentNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Destination:</span>
                  <span className="font-bold text-[#056468]">{successInfo.transfer?.destinationFc}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Units Kept at FBA:</span>
                  <span className="font-bold text-emerald-700">{successInfo.transfer?.totalUnits} Units</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setSuccessInfo(null);
                    setScannedItems([]);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Transfer Another Batch
                </button>
                {onOpenTally && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenTally();
                    }}
                    className="px-5 py-2.5 bg-[#056468] hover:bg-[#044e51] text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all"
                  >
                    <ClipboardList className="w-4 h-4" />
                    <span>Open FBA Monthly Tally System</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Channel & Destination Config */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                {/* Channel */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Marketplace / FBA Channel
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleChannelSelect("AMAZON_FBA")}
                      className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all ${
                        channel === "AMAZON_FBA"
                          ? "bg-amber-50 border-amber-500 text-amber-900 shadow-xs"
                          : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Amazon FBA
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChannelSelect("FLIPKART_FBF")}
                      className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all ${
                        channel === "FLIPKART_FBF"
                          ? "bg-blue-50 border-blue-500 text-blue-900 shadow-xs"
                          : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Flipkart FBF
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChannelSelect("MEESHO_3PL")}
                      className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all ${
                        channel === "MEESHO_3PL"
                          ? "bg-purple-50 border-purple-500 text-purple-900 shadow-xs"
                          : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Meesho 3PL
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChannelSelect("OTHER_3PL")}
                      className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all ${
                        channel === "OTHER_3PL"
                          ? "bg-slate-200 border-slate-500 text-slate-900 shadow-xs"
                          : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Other FC
                    </button>
                  </div>
                </div>

                {/* Destination FC */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#056468]" />
                    Destination Fulfillment Center
                  </label>
                  <input
                    type="text"
                    value={destinationFc}
                    onChange={(e) => setDestinationFc(e.target.value)}
                    placeholder="e.g. Amazon FC BOM5 (Bhiwandi)"
                    className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#056468]"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {FC_PRESETS.slice(0, 3).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setDestinationFc(preset)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
                      >
                        {preset.split(" ")[2] || preset.split(" ")[1]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Shipment Ref & Inbound Courier */}
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-[#056468]" />
                      Shipment / Inbound Ref ID
                    </label>
                    <input
                      type="text"
                      value={shipmentNumber}
                      onChange={(e) => setShipmentNumber(e.target.value)}
                      placeholder="e.g. FBA-AMZ-202611-102"
                      className="w-full text-xs font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-[#056468]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={trackingId}
                      onChange={(e) => setTrackingId(e.target.value)}
                      placeholder="Inbound AWB (Optional)"
                      className="w-1/2 text-[11px] px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                    <input
                      type="text"
                      value={courier}
                      onChange={(e) => setCourier(e.target.value)}
                      placeholder="Courier / Transport"
                      className="w-1/2 text-[11px] px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Barcode Scanner Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#056468] uppercase tracking-wider flex items-center gap-1.5">
                    <ScanBarcode className="w-4 h-4" />
                    <span>Scan Unit Barcodes (Continuous Hardware Scanner)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPasteBox(!showPasteBox)}
                    className="text-xs text-[#056468] hover:underline font-semibold flex items-center gap-1"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span>{showPasteBox ? "Hide Paste Box" : "📋 Paste Bulk Barcodes"}</span>
                  </button>
                </div>

                {showPasteBox ? (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                    <p className="text-xs text-amber-900 font-medium">
                      Paste multiple unit barcodes separated by commas, spaces, or newlines (e.g. copied from Excel/Manifest):
                    </p>
                    <textarea
                      value={pasteInput}
                      onChange={(e) => setPasteInput(e.target.value)}
                      placeholder="299420114239&#10;299420114240&#10;299420114241"
                      rows={3}
                      className="w-full text-xs font-mono p-2 border border-amber-300 rounded-lg bg-white focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPasteBox(false)}
                        className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleBulkPasteAdd}
                        disabled={lookupLoading}
                        className="px-4 py-1.5 bg-[#056468] hover:bg-[#044e51] text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5"
                      >
                        {lookupLoading ? "Validating..." : "Add All Scanned to Batch"}
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
                      placeholder="Point scanner & scan unit barcode sticker (e.g. 299420114239)..."
                      className="flex-1 bg-slate-50 border-2 border-[#056468] rounded-xl px-4 py-2.5 text-base font-mono font-bold text-[#0b252c] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#056468]/30"
                    />
                    <button
                      type="submit"
                      disabled={lookupLoading}
                      className="px-5 py-2.5 bg-[#056468] hover:bg-[#044e51] text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
                    >
                      <ScanBarcode className="w-4 h-4" />
                      {lookupLoading ? "Checking..." : "Add Unit"}
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

              {/* Scanned Items Summary KPI */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-center">
                  <div className="text-[11px] font-bold text-teal-800 uppercase">Units Scanned</div>
                  <div className="text-2xl font-black text-teal-900 mt-0.5">{scannedItems.length}</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <div className="text-[11px] font-bold text-slate-600 uppercase">Distinct SKUs</div>
                  <div className="text-2xl font-black text-slate-800 mt-0.5">{distinctSkus}</div>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <div className="text-[11px] font-bold text-amber-800 uppercase">Total Inventory Value</div>
                  <div className="text-2xl font-black text-amber-900 mt-0.5">₹{totalValue.toLocaleString("en-IN")}</div>
                </div>
              </div>

              {/* Scanned Units List */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Scanned Units Manifest ({scannedItems.length})</span>
                  {scannedItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setScannedItems([])}
                      className="text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear All
                    </button>
                  )}
                </div>

                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {scannedItems.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No units scanned yet. Scan barcodes with hardware scanner or paste a list above.
                    </div>
                  ) : (
                    scannedItems.map((item, idx) => (
                      <div
                        key={`${item.barcode}-${idx}`}
                        className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-6 text-slate-400 font-mono text-[11px]">#{idx + 1}</span>
                          <div>
                            <div className="font-bold text-[#0b252c]">{item.productName}</div>
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                              <span>SKU: <strong className="text-slate-700">{item.sku}</strong></span>
                              <span>•</span>
                              <span>Barcode: <strong className="text-[#056468]">{item.barcode}</strong></span>
                              <span>•</span>
                              <span>Unit #{item.serialNumber}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="font-bold font-mono text-slate-700">
                            ₹{item.price.toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="Remove from batch"
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
              {scannedItems.length} unit(s) ready for inward transfer to FBA.
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
                    ? "Transferring Units..."
                    : `Confirm & Transfer ${scannedItems.length} Units to FBA`}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
