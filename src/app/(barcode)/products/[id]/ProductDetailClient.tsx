"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PrintLabelDialog } from "@/components/PrintLabelDialog";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";
import { BarcodeSvg } from "@/components/BarcodeSvg";
import {
  Package,
  ScanBarcode,
  Printer,
  Plus,
  ArrowLeft,
  X,
  CheckCircle2,
  Zap,
  Layers,
  CheckSquare,
  Square,
  Trash2,
} from "lucide-react";

export default function ProductDetailClient({ product }: { product: any }) {
  const router = useRouter();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const variant = product.variants[0];
  const unitBarcodes = variant?.unitBarcodes || [];
  const inventory = variant?.inventory;

  const availableCount = unitBarcodes.filter((u: any) => u.status === "AVAILABLE").length;
  const soldCount = unitBarcodes.filter((u: any) => u.status === "SOLD").length;

  // Multi-Select State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Print Dialog State
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printBarcodes, setPrintBarcodes] = useState<string[]>([]);
  const [singleUnitSerial, setSingleUnitSerial] = useState<number | undefined>(undefined);

  // Receive Stock Modal State
  const [addStockOpen, setAddStockOpen] = useState(false);
  const [qtyToAdd, setQtyToAdd] = useState(10);
  const [addingStock, setAddingStock] = useState(false);
  const [addStockStep, setAddStockStep] = useState<"input" | "success">("input");
  const [newlyGeneratedBarcodes, setNewlyGeneratedBarcodes] = useState<string[]>([]);

  // Toggle Single Selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle Select All
  const toggleSelectAll = () => {
    if (selectedIds.size === unitBarcodes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unitBarcodes.map((u: any) => u.id)));
    }
  };

  // Print Single Unit
  const handleOpenPrintSingle = (unit: any) => {
    setPrintBarcodes([unit.barcode]);
    setSingleUnitSerial(unit.serialNumber);
    setIsPrintOpen(true);
  };

  // Print Selected Units in Batch
  const handlePrintSelected = () => {
    const selectedUnits = unitBarcodes.filter((u: any) => selectedIds.has(u.id));
    if (selectedUnits.length === 0) {
      alert("Please select at least one unit barcode to print.");
      return;
    }
    setPrintBarcodes(selectedUnits.map((u: any) => u.barcode));
    setSingleUnitSerial(undefined);
    setIsPrintOpen(true);
  };

  // Print All Units in Batch
  const handlePrintAll = () => {
    if (unitBarcodes.length === 0) {
      alert("No unit barcodes available to print.");
      return;
    }
    setPrintBarcodes(unitBarcodes.map((u: any) => u.barcode));
    setSingleUnitSerial(undefined);
    setIsPrintOpen(true);
  };

  // Receive Stock Handler
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variant) return;

    setAddingStock(true);
    try {
      const res = await fetch("/api/barcodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productVariantId: variant.id,
          quantity: qtyToAdd,
          note: `Stock receiving — added ${qtyToAdd} per-unit barcodes`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate barcodes");
      }

      setNewlyGeneratedBarcodes(data.barcodes || []);
      setAddStockStep("success");
    } catch (err: any) {
      alert("Stock Receive Error: " + err.message);
    } finally {
      setAddingStock(false);
    }
  };

  // Delete Product Handler
  const handleConfirmDeleteProduct = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setIsDeleteModalOpen(false);
        router.push("/products");
      } else {
        alert(data.error || "Failed to delete product");
      }
    } catch (err: any) {
      alert("Delete Error: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 py-2">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#cce7ed] pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#4a6870] mb-1">
            <Link href="/products" className="hover:text-[#056468] flex items-center gap-1 font-semibold">
              <ArrowLeft className="w-3.5 h-3.5" />
              Products Catalog
            </Link>
            <span>/</span>
            <span className="text-[#0b252c] font-semibold">{product.name}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0b252c] flex items-center gap-3 flex-wrap">
            <span>{product.name}</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-[#e3f2f5] text-[#056468] border border-[#cce7ed] font-mono">
              SKU: {variant?.sku}
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handlePrintAll}
            disabled={unitBarcodes.length === 0}
            className="px-3.5 py-2 rounded-lg bg-white hover:bg-[#f0f8fa] active:scale-95 text-[#056468] font-semibold text-xs border border-[#cce7ed] shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print All ({unitBarcodes.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAddStockStep("input");
              setQtyToAdd(10);
              setNewlyGeneratedBarcodes([]);
              setAddStockOpen(true);
            }}
            className="px-4 py-2 rounded-lg bg-[#056468] hover:bg-[#044e51] active:scale-95 text-white font-medium text-xs shadow transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Receive Stock (+ Generate Barcodes)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 font-semibold text-xs border border-rose-200 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Delete Product and its barcodes"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Info Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#cce7ed] rounded-xl p-4 space-y-1 shadow-sm">
          <div className="text-xs text-[#4a6870] font-medium">Category / Brand</div>
          <div className="font-semibold text-[#0b252c] text-sm">{product.category?.name || "General"}</div>
          <div className="text-[11px] text-[#5f818b]">Brand: {product.brand || "N/A"}</div>
        </div>

        <div className="bg-white border border-[#cce7ed] rounded-xl p-4 space-y-1 shadow-sm">
          <div className="text-xs text-[#4a6870] font-medium">Pricing & GST</div>
          <div className="font-bold text-[#056468] text-base">
            ₹{(product.offerPrice || variant?.sellingPrice || 0).toFixed(2)}
          </div>
          <div className="text-[11px] text-[#5f818b]">
            MRP ₹{product.mrp} | GST {product.gstPercent}%
          </div>
        </div>

        <div className="bg-white border border-[#cce7ed] rounded-xl p-4 space-y-1 shadow-sm">
          <div className="text-xs text-[#056468] font-medium">Available Units</div>
          <div className="font-bold text-2xl text-[#056468]">{availableCount}</div>
          <div className="text-[11px] text-emerald-700 font-medium">Ready to Scan & Sell</div>
        </div>

        <div className="bg-white border border-[#cce7ed] rounded-xl p-4 space-y-1 shadow-sm">
          <div className="text-xs text-purple-700 font-medium">Sold Units</div>
          <div className="font-bold text-2xl text-purple-700">{soldCount}</div>
          <div className="text-[11px] text-purple-600 font-medium">Total Barcodes Sold</div>
        </div>
      </div>

      {/* Per-Unit Serial Barcodes Section */}
      <div className="bg-white border border-[#cce7ed] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#cce7ed] pb-3">
          <div>
            <h2 className="text-base font-semibold text-[#0b252c] flex items-center gap-2">
              <ScanBarcode className="w-5 h-5 text-[#056468]" />
              <span>Per-Unit Serial Barcode Registry</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#e3f2f5] text-[#056468] font-mono border border-[#cce7ed]">
                {unitBarcodes.length} Barcodes Generated
              </span>
            </h2>
            <p className="text-xs text-[#4a6870] mt-0.5 font-normal">
              Select multiple units using checkboxes to batch print thermal stickers on rolls or PDF.
            </p>
          </div>

          {/* Batch Actions Toolbar */}
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2 bg-[#e3f2f5] border border-[#b2dce5] px-3 py-1.5 rounded-lg text-xs animate-in fade-in">
                <span className="font-semibold text-[#056468]">
                  {selectedIds.size} of {unitBarcodes.length} Selected
                </span>
                <button
                  type="button"
                  onClick={handlePrintSelected}
                  className="px-3 py-1 bg-[#056468] hover:bg-[#044e51] text-white font-medium rounded shadow-xs flex items-center gap-1"
                >
                  <Printer className="w-3 h-3" />
                  <span>Print Selected ({selectedIds.size})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-[#4a6870] hover:text-[#0b252c] text-[11px] underline ml-1"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {unitBarcodes.length === 0 ? (
          <div className="text-center py-10 text-[#5f818b] text-xs space-y-2">
            <Package className="w-10 h-10 text-[#056468] mx-auto opacity-60" />
            <p>No per-unit barcodes generated for this product variant yet.</p>
            <button
              onClick={() => {
                setAddStockStep("input");
                setAddStockOpen(true);
              }}
              className="px-3.5 py-1.5 bg-[#056468] text-white font-medium text-xs rounded-lg shadow-sm"
            >
              + Receive Stock & Generate Barcodes
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#cce7ed]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f0f8fa] text-[#0b252c] font-semibold uppercase tracking-wider border-b border-[#cce7ed]">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === unitBarcodes.length && unitBarcodes.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-[#cce7ed] text-[#056468] focus:ring-[#056468] cursor-pointer"
                      title="Select / Deselect All"
                    />
                  </th>
                  <th className="p-3">Unit #</th>
                  <th className="p-3">Unit Barcode</th>
                  <th className="p-3">Barcode Visual</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Generated Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#cce7ed] font-normal">
                {unitBarcodes.map((unit: any) => {
                  const isChecked = selectedIds.has(unit.id);
                  return (
                    <tr
                      key={unit.id}
                      className={`hover:bg-[#f8fcfe] transition-colors ${
                        isChecked ? "bg-[#f0f8fa]" : "bg-white"
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(unit.id)}
                          className="rounded border-[#cce7ed] text-[#056468] focus:ring-[#056468] cursor-pointer"
                        />
                      </td>
                      <td className="p-3 font-semibold text-[#056468] font-mono">
                        Unit #{unit.serialNumber}
                      </td>
                      <td className="p-3 font-semibold text-[#0b252c] font-mono tracking-wider">
                        {unit.barcode}
                      </td>
                      <td className="p-3">
                        <div className="bg-white p-1 rounded border border-[#cce7ed] inline-block shadow-xs">
                          <BarcodeSvg barcode={unit.barcode} height={24} width={1.2} fontSize={8} />
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            unit.status === "AVAILABLE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : unit.status === "SOLD"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {unit.status}
                        </span>
                      </td>
                      <td className="p-3 text-[#4a6870]">
                        {new Date(unit.generatedAt).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenPrintSingle(unit)}
                          className="px-3 py-1.5 bg-[#056468] hover:bg-[#044e51] text-white font-medium text-[11px] rounded-lg shadow-xs transition-all inline-flex items-center gap-1"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Thermal Label</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock Receive Modal */}
      {addStockOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto pointer-events-auto">
          <div className="relative z-[10000] bg-white border border-[#cce7ed] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 text-[#0b252c]">
            <div className="flex items-center justify-between border-b border-[#cce7ed] pb-3">
              <h3 className="text-base font-semibold text-[#0b252c] flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#056468] fill-current" />
                <span>{addStockStep === "input" ? "Receive Stock & Generate Barcodes" : "Stock Added Successfully"}</span>
              </h3>
              <button
                onClick={() => {
                  if (addStockStep === "success") {
                    window.location.reload();
                  } else {
                    setAddStockOpen(false);
                  }
                }}
                className="text-[#5f818b] hover:text-[#0b252c] text-base"
              >
                ✕
              </button>
            </div>

            {addStockStep === "input" && (
              <form onSubmit={handleAddStock} className="space-y-4 text-xs">
                <p className="text-xs text-[#4a6870] font-normal">
                  Receiving stock for SKU <strong className="font-mono text-[#056468]">{variant?.sku}</strong> will automatically generate sequential 12-digit Code 128 barcodes and update inventory.
                </p>

                <div>
                  <label className="block font-medium text-[#0b252c] mb-1">
                    Quantity of New Units Received *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    required
                    value={qtyToAdd}
                    onChange={(e) => setQtyToAdd(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-lg px-3 py-2 text-lg text-[#056468] font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[#056468]"
                  />
                </div>

                {/* Quick Presets */}
                <div>
                  <span className="text-[11px] text-[#4a6870] font-medium block mb-1">Quick Presets:</span>
                  <div className="flex items-center gap-2">
                    {[5, 10, 20, 50, 100].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setQtyToAdd(num)}
                        className={`px-3 py-1 rounded font-mono font-medium text-xs border ${
                          qtyToAdd === num
                            ? "bg-[#056468] text-white border-[#056468]"
                            : "bg-[#f0f8fa] text-[#056468] border-[#cce7ed] hover:bg-[#e3f2f5]"
                        }`}
                      >
                        +{num}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#cce7ed]">
                  <button
                    type="button"
                    onClick={() => setAddStockOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-[#4a6870] hover:text-[#0b252c]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingStock}
                    className="px-5 py-2.5 bg-[#056468] hover:bg-[#044e51] text-white text-xs font-medium rounded-lg shadow-sm flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{addingStock ? "Generating Barcodes..." : `Generate Barcodes & Add +${qtyToAdd}`}</span>
                  </button>
                </div>
              </form>
            )}

            {addStockStep === "success" && (
              <div className="space-y-4 text-xs">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="text-sm font-bold text-emerald-900">
                    Added +{newlyGeneratedBarcodes.length} Units to Stock!
                  </h4>
                  <p className="text-xs text-emerald-700">
                    Sequential Code 128 barcodes ready: {newlyGeneratedBarcodes[0]}..{newlyGeneratedBarcodes[newlyGeneratedBarcodes.length - 1]}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPrintBarcodes(newlyGeneratedBarcodes);
                    setSingleUnitSerial(undefined);
                    setIsPrintOpen(true);
                  }}
                  className="w-full py-3 bg-[#056468] hover:bg-[#044e51] text-white font-bold text-sm rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>🖨️ Batch Print All {newlyGeneratedBarcodes.length} Thermal Labels</span>
                </button>

                <div className="flex items-center justify-end pt-2 border-t border-[#cce7ed]">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-5 py-2 bg-[#056468] hover:bg-[#044e51] text-white font-medium rounded-lg text-xs"
                  >
                    Done & Refresh Page
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Universal Thermal Label Printer Dialog */}
      {isPrintOpen && (
        <PrintLabelDialog
          isOpen={isPrintOpen}
          onClose={() => setIsPrintOpen(false)}
          productName={product.name}
          sku={variant?.sku || "SKU"}
          price={product.offerPrice || variant?.sellingPrice || 0}
          barcodes={printBarcodes}
          serialNumber={singleUnitSerial}
        />
      )}

      {/* Safety Delete Product Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDeleteProduct}
        title="Delete Product & All Associated Barcodes"
        itemName={`${product.name} (SKU: ${variant?.sku || "N/A"})`}
        confirmKeyword="RESET"
      />
    </div>
  );
}


