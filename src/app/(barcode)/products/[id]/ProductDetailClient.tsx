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
  Minus,
  RotateCcw,
  ArrowLeft,
  X,
  CheckCircle2,
  Zap,
  Layers,
  CheckSquare,
  Square,
  Trash2,
  Edit,
  Save,
  Globe,
  Tag,
  DollarSign,
  ShieldCheck,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  Building2,
  Truck,
  Hash,
  Info,
  AlertTriangle,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  mainUse?: string;
}

export default function ProductDetailClient({
  initialProduct,
  categories = [],
}: {
  initialProduct: any;
  categories?: Category[];
}) {
  const router = useRouter();

  // Active product state
  const [product, setProduct] = useState(initialProduct);

  const variant = product?.variants?.[0];
  const unitBarcodes = variant?.unitBarcodes || [];
  const inventory = variant?.inventory;

  const availableUnits = unitBarcodes.filter((u: any) => u.status === "AVAILABLE");
  const availableCount = availableUnits.length;
  const soldUnits = unitBarcodes.filter((u: any) => u.status === "SOLD");
  const soldCount = soldUnits.length;
  const damagedCount = unitBarcodes.filter((u: any) => u.status === "DAMAGED").length;

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Edit Form Values
  const [editForm, setEditForm] = useState({
    name: product.name || "",
    sku: variant?.sku || "",
    brand: product.brand || "",
    vendor: product.vendor || "",
    hsn: product.hsn || "",
    mrp: product.mrp ?? 0,
    offerPrice: product.offerPrice ?? (variant?.sellingPrice ?? 0),
    purchasePrice: variant?.purchasePrice ?? 0,
    sellingPrice: variant?.sellingPrice ?? (product.offerPrice ?? 0),
    gstPercent: product.gstPercent ?? 18,
    status: product.status || "ACTIVE",
    productType: product.productType || "PRODUCT",
    unit: variant?.unit || "PCS",
    color: variant?.color || "",
    size: variant?.size || "",
    description: product.description || "",
    imageUrl: product.imageUrl || "",
    categoryId: product.categoryId || "",
    subCategoryId: product.subCategoryId || "",
    level2CategoryId: product.level2CategoryId || "",
    showOnWebsite: product.showOnWebsite ?? true,
    featured: product.featured ?? false,
    badge: product.badge || "",
    homepageSections: product.homepageSections || ["FEATURED"],
    displayOrder: product.displayOrder ?? 99,
    tags: product.tags || "",
  });

  // Open Edit Modal and sync form values
  const handleOpenEdit = () => {
    setEditForm({
      name: product.name || "",
      sku: variant?.sku || "",
      brand: product.brand || "",
      vendor: product.vendor || "",
      hsn: product.hsn || "",
      mrp: product.mrp ?? 0,
      offerPrice: product.offerPrice ?? (variant?.sellingPrice ?? 0),
      purchasePrice: variant?.purchasePrice ?? 0,
      sellingPrice: variant?.sellingPrice ?? (product.offerPrice ?? 0),
      gstPercent: product.gstPercent ?? 18,
      status: product.status || "ACTIVE",
      productType: product.productType || "PRODUCT",
      unit: variant?.unit || "PCS",
      color: variant?.color || "",
      size: variant?.size || "",
      description: product.description || "",
      imageUrl: product.imageUrl || "",
      categoryId: product.categoryId || "",
      subCategoryId: product.subCategoryId || "",
      level2CategoryId: product.level2CategoryId || "",
      showOnWebsite: product.showOnWebsite ?? true,
      featured: product.featured ?? false,
      badge: product.badge || "",
      homepageSections: product.homepageSections || ["FEATURED"],
      displayOrder: product.displayOrder ?? 99,
      tags: product.tags || "",
    });
    setIsEditModalOpen(true);
  };

  // Categories hierarchy
  const mainCategories = categories.filter((c) => !c.parentId || c.parentId === "");
  const subCategories = categories.filter((c) => c.parentId === editForm.categoryId);
  const level2Categories = categories.filter((c) => c.parentId === editForm.subCategoryId);

  // Form Change Handler
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setEditForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setEditForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Image Upload Handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Image upload failed");

      setEditForm((prev) => ({ ...prev, imageUrl: data.url }));
    } catch (err: any) {
      alert("Image Upload Error: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  // Save Product Details Handler
  const handleSaveProductDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          mrp: parseFloat(String(editForm.mrp)) || 0,
          offerPrice: parseFloat(String(editForm.offerPrice)) || 0,
          sellingPrice: parseFloat(String(editForm.offerPrice)) || 0,
          purchasePrice: parseFloat(String(editForm.purchasePrice)) || 0,
          gstPercent: parseFloat(String(editForm.gstPercent)) || 0,
          displayOrder: parseInt(String(editForm.displayOrder)) || 99,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update product");
      }

      setProduct(data);
      setIsEditModalOpen(false);
      setFeedback({ type: "success", message: "Product details saved successfully!" });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "Failed to update product" });
    } finally {
      setIsSaving(false);
    }
  };

  // Multi-Select State for Barcodes
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

  // Reduce / Remove Extra Stock Modal State
  const [reduceStockOpen, setReduceStockOpen] = useState(false);
  const [qtyToReduce, setQtyToReduce] = useState(1);
  const [reduceReason, setReduceReason] = useState("Accidental extra stock entry");
  const [reducingStock, setReducingStock] = useState(false);

  // Delete Entire Product Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Reduce / Undo Extra Stock Handler (Removes last N available unit barcodes)
  const handleReduceStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variant || qtyToReduce <= 0) return;

    if (qtyToReduce > availableCount) {
      alert(`Cannot remove ${qtyToReduce} units because only ${availableCount} units are currently available.`);
      return;
    }

    setReducingStock(true);
    try {
      const res = await fetch("/api/barcodes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productVariantId: variant.id,
          count: qtyToReduce,
          reason: reduceReason.trim() || `Removed ${qtyToReduce} extra unit barcodes`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reduce stock");
      }

      const removedIds = new Set(data.removedIds || []);
      setProduct((prev: any) => {
        const updatedVariants = prev.variants.map((v: any) => {
          if (v.id === variant.id) {
            const updatedUnits = v.unitBarcodes.filter((u: any) => !removedIds.has(u.id));
            return {
              ...v,
              unitBarcodes: updatedUnits,
              inventory: {
                ...v.inventory,
                quantity: data.newAvailableStock,
              },
            };
          }
          return v;
        });
        return { ...prev, variants: updatedVariants };
      });

      setReduceStockOpen(false);
      setFeedback({ type: "success", message: data.message || `Removed ${qtyToReduce} extra unit barcodes.` });
      setTimeout(() => setFeedback(null), 6000);
    } catch (err: any) {
      alert("Reduce Stock Error: " + err.message);
    } finally {
      setReducingStock(false);
    }
  };

  // Delete Individual Unit Barcode Handler
  const handleDeleteSingleUnit = async (unit: any) => {
    if (!confirm(`Are you sure you want to remove unit barcode #${unit.serialNumber} (${unit.barcode}) and release its serial number?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/barcodes?id=${unit.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete barcode");

      setProduct((prev: any) => {
        const updatedVariants = prev.variants.map((v: any) => {
          if (v.id === variant.id) {
            const updatedUnits = v.unitBarcodes.filter((u: any) => u.id !== unit.id);
            const newAvail = updatedUnits.filter((u: any) => u.status === "AVAILABLE").length;
            return {
              ...v,
              unitBarcodes: updatedUnits,
              inventory: {
                ...v.inventory,
                quantity: newAvail,
              },
            };
          }
          return v;
        });
        return { ...prev, variants: updatedVariants };
      });

      setFeedback({ type: "success", message: `Unit barcode #${unit.serialNumber} removed. Serial number released.` });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      alert("Delete Error: " + err.message);
    }
  };

  // Delete Selected Unit Barcodes
  const handleDeleteSelectedUnits = async () => {
    const selectedUnits = unitBarcodes.filter((u: any) => selectedIds.has(u.id));
    if (selectedUnits.length === 0) return;

    if (!confirm(`Remove ${selectedUnits.length} selected unit barcode(s) and release their serial numbers for reuse?`)) {
      return;
    }

    try {
      const ids = Array.from(selectedIds);
      const res = await fetch("/api/barcodes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete selected units");

      const deletedSet = new Set(ids);
      setProduct((prev: any) => {
        const updatedVariants = prev.variants.map((v: any) => {
          if (v.id === variant.id) {
            const updatedUnits = v.unitBarcodes.filter((u: any) => !deletedSet.has(u.id));
            const newAvail = updatedUnits.filter((u: any) => u.status === "AVAILABLE").length;
            return {
              ...v,
              unitBarcodes: updatedUnits,
              inventory: {
                ...v.inventory,
                quantity: newAvail,
              },
            };
          }
          return v;
        });
        return { ...prev, variants: updatedVariants };
      });

      setSelectedIds(new Set());
      setFeedback({ type: "success", message: `Deleted ${ids.length} unit barcode(s). Serial numbers released.` });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      alert("Delete Error: " + err.message);
    }
  };

  // Reopen / Reset Unit Status to AVAILABLE
  const handleResetUnitStatus = async (unitId: string, newStatus: string = "AVAILABLE") => {
    try {
      const res = await fetch("/api/barcodes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: unitId, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update unit status");

      setProduct((prev: any) => {
        const updatedVariants = prev.variants.map((v: any) => {
          if (v.id === variant.id) {
            const updatedUnits = v.unitBarcodes.map((u: any) =>
              u.id === unitId ? { ...u, status: newStatus, soldAt: null } : u
            );
            const newAvail = updatedUnits.filter((u: any) => u.status === "AVAILABLE").length;
            return {
              ...v,
              unitBarcodes: updatedUnits,
              inventory: {
                ...v.inventory,
                quantity: newAvail,
              },
            };
          }
          return v;
        });
        return { ...prev, variants: updatedVariants };
      });

      setFeedback({ type: "success", message: `Unit barcode reset to ${newStatus} for reuse.` });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      alert("Status Update Error: " + err.message);
    }
  };

  // Delete Entire Product Handler
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

  const marginAmount = (product.offerPrice || variant?.sellingPrice || 0) - (variant?.purchasePrice || 0);
  const marginPercent =
    variant?.purchasePrice && variant.purchasePrice > 0
      ? ((marginAmount / variant.purchasePrice) * 100).toFixed(1)
      : null;

  return (
    <div className="space-y-6 py-2">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-900 border-emerald-200"
              : "bg-rose-50 text-rose-900 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-[#0b252c] flex items-center gap-3">
              {product.name}
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-[#e3f2f5] text-[#056468] border border-[#cce7ed] font-mono">
              SKU: {variant?.sku}
            </span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                product.status === "ACTIVE"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : product.status === "OUT_OF_STOCK"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {product.status}
            </span>
            {product.showOnWebsite ? (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1">
                <Globe className="w-3 h-3" />
                Live on Website
              </span>
            ) : (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                Hidden from Website
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* EDIT PRODUCT BUTTON */}
          <button
            type="button"
            onClick={handleOpenEdit}
            className="px-3.5 py-2 rounded-lg bg-teal-50 hover:bg-teal-100 active:scale-95 text-[#056468] font-bold text-xs border border-teal-200 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="Edit all product fields, name, pricing, category, SKU, etc."
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit Details</span>
          </button>

          {/* PRINT ALL BUTTON */}
          <button
            type="button"
            onClick={handlePrintAll}
            disabled={unitBarcodes.length === 0}
            className="px-3.5 py-2 rounded-lg bg-white hover:bg-[#f0f8fa] active:scale-95 text-[#056468] font-semibold text-xs border border-[#cce7ed] shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print All ({unitBarcodes.length})</span>
          </button>

          {/* RECEIVE STOCK BUTTON */}
          <button
            type="button"
            onClick={() => {
              setAddStockStep("input");
              setQtyToAdd(10);
              setNewlyGeneratedBarcodes([]);
              setAddStockOpen(true);
            }}
            className="px-3.5 py-2 rounded-lg bg-[#056468] hover:bg-[#044e51] active:scale-95 text-white font-medium text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Receive Stock</span>
          </button>

          {/* REDUCE / UNDO STOCK BUTTON */}
          <button
            type="button"
            onClick={() => {
              setQtyToReduce(Math.min(1, availableCount));
              setReduceStockOpen(true);
            }}
            disabled={availableCount === 0}
            className="px-3 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-800 font-semibold text-xs border border-amber-200 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Remove accidental extra stock and release serial numbers"
          >
            <Minus className="w-3.5 h-3.5" />
            <span>Reduce / Undo Stock</span>
          </button>

          {/* DELETE PRODUCT BUTTON */}
          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 font-semibold text-xs border border-rose-200 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Delete Product and its barcodes"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Info Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Category / Brand / Hierarchy */}
        <div className="bg-white border border-[#cce7ed] rounded-xl p-4 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="text-xs text-[#4a6870] font-medium">Category & Brand</div>
            <Tag className="w-3.5 h-3.5 text-[#056468]" />
          </div>
          <div className="font-bold text-[#0b252c] text-sm truncate">
            {product.category?.name || "General Category"}
          </div>
          <div className="text-[11px] text-slate-500 space-y-0.5">
            <div>Brand: <strong className="text-slate-800">{product.brand || "Standard"}</strong></div>
            {product.subCategory && (
              <div>Sub-Cat: <span className="text-slate-700">{product.subCategory.name}</span></div>
            )}
            {product.hsn && <div>HSN: <span className="font-mono text-slate-700">{product.hsn}</span></div>}
          </div>
        </div>

        {/* Card 2: Pricing & Margins */}
        <div className="bg-white border border-[#cce7ed] rounded-xl p-4 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="text-xs text-[#4a6870] font-medium">Selling & Offer Price</div>
            <DollarSign className="w-3.5 h-3.5 text-[#056468]" />
          </div>
          <div className="font-bold text-[#056468] text-xl">
            ₹{(product.offerPrice || variant?.sellingPrice || 0).toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 space-y-0.5">
            <div>MRP: <span className="line-through text-slate-400 font-medium">₹{product.mrp}</span> | GST {product.gstPercent}%</div>
            {variant?.purchasePrice > 0 && (
              <div className="text-emerald-700 font-medium">
                Cost ₹{variant.purchasePrice} {marginPercent && `(+${marginPercent}% margin)`}
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Available Inventory */}
        <div className="bg-white border border-[#cce7ed] rounded-xl p-4 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="text-xs text-[#056468] font-medium">Available Units</div>
            <ScanBarcode className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="font-bold text-2xl text-[#056468]">{availableCount}</div>
          <div className="text-[11px] text-emerald-700 font-medium">
            Ready to Scan & Sell (Unit: {variant?.unit || "PCS"})
          </div>
        </div>

        {/* Card 4: Sold / Damaged Units */}
        <div className="bg-white border border-[#cce7ed] rounded-xl p-4 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="text-xs text-purple-700 font-medium">Sold Barcodes</div>
            <Package className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="font-bold text-2xl text-purple-700">{soldCount}</div>
          <div className="text-[11px] text-slate-500">
            Total Generated: <strong className="text-slate-800">{unitBarcodes.length} pcs</strong>
          </div>
        </div>
      </div>

      {/* Description & Website Metadata Accordion Card */}
      {(product.description || product.imageUrl || product.tags) && (
        <div className="bg-white border border-[#cce7ed] rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-start gap-4">
          {product.imageUrl && (
            <div className="w-24 h-24 rounded-lg bg-slate-50 border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center">
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="space-y-1.5 flex-1 text-xs">
            <div className="font-bold text-slate-800 text-sm">Product Description & Specs</div>
            <p className="text-slate-600 whitespace-pre-line leading-relaxed">
              {product.description || "No description specified."}
            </p>
            {product.tags && (
              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tags:</span>
                {product.tags.split(",").map((tag: string, idx: number) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">
                    #{tag.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Per-Unit Serial Barcodes Section */}
      <div className="bg-white border border-[#cce7ed] rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#cce7ed] pb-3">
          <div>
            <h2 className="text-base font-semibold text-[#0b252c] flex items-center gap-2">
              <ScanBarcode className="w-5 h-5 text-[#056468]" />
              <span>Per-Unit Serial Barcode Registry</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#e3f2f5] text-[#056468] font-mono border border-[#cce7ed]">
                {unitBarcodes.length} Barcodes ({availableCount} Available)
              </span>
            </h2>
            <p className="text-xs text-[#4a6870] mt-0.5">
              Individual sequential 12-digit Code 128 barcodes. If extra stock was entered, remove it to release serial numbers for reuse.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Reduce stock button in registry */}
            <button
              type="button"
              onClick={() => {
                setQtyToReduce(Math.min(1, availableCount));
                setReduceStockOpen(true);
              }}
              disabled={availableCount === 0}
              className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold text-xs border border-amber-200 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
              <span>Remove Extra Stock</span>
            </button>

            <button
              type="button"
              onClick={toggleSelectAll}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#f0f8fa] text-[#056468] font-medium text-xs border border-[#cce7ed] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {selectedIds.size === unitBarcodes.length && unitBarcodes.length > 0 ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-[#056468]" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-[#4a6870]" />
                  <span>Select All ({unitBarcodes.length})</span>
                </>
              )}
            </button>

            {/* Selected Batch Actions */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrintSelected}
                  className="px-3 py-1.5 rounded-lg bg-[#056468] hover:bg-[#044e51] text-white font-medium text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print ({selectedIds.size})</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeleteSelectedUnits}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Remove selected unit barcodes and release their serial numbers"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedIds.size})</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Barcode Grid */}
        {unitBarcodes.length === 0 ? (
          <div className="text-center py-10 bg-[#f8fcfe] rounded-xl border border-dashed border-[#cce7ed] space-y-3">
            <ScanBarcode className="w-8 h-8 text-[#5f818b] mx-auto opacity-50" />
            <div className="text-xs font-semibold text-[#0b252c]">No unit barcodes generated yet</div>
            <p className="text-xs text-[#4a6870] max-w-sm mx-auto">
              Click &quot;Receive Stock&quot; to generate individual serial barcodes for this product.
            </p>
            <button
              type="button"
              onClick={() => {
                setAddStockStep("input");
                setQtyToAdd(10);
                setAddStockOpen(true);
              }}
              className="px-4 py-2 bg-[#056468] hover:bg-[#044e51] text-white text-xs font-medium rounded-lg shadow-xs cursor-pointer"
            >
              Generate First 10 Barcodes
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {unitBarcodes.map((unit: any) => {
              const isSelected = selectedIds.has(unit.id);
              const isAvailable = unit.status === "AVAILABLE";
              const isSold = unit.status === "SOLD";

              return (
                <div
                  key={unit.id}
                  onClick={() => toggleSelect(unit.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer select-none relative flex flex-col justify-between space-y-2 ${
                    isSelected
                      ? "bg-[#e3f2f5] border-[#056468] shadow-xs"
                      : "bg-[#f8fcfe] border-[#cce7ed] hover:border-[#056468]/50"
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border ${
                          isSelected
                            ? "bg-[#056468] border-[#056468] text-white"
                            : "border-[#5f818b] bg-white"
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                      <span className="font-mono text-xs font-bold text-[#056468]">
                        #{unit.serialNumber}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isAvailable
                          ? "bg-emerald-100 text-emerald-800"
                          : isSold
                          ? "bg-purple-100 text-purple-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {unit.status}
                    </span>
                  </div>

                  {/* Visual Code 128 Barcode */}
                  <div className="py-1">
                    <BarcodeSvg
                      value={unit.barcode}
                      width={1.2}
                      height={36}
                      fontSize={11}
                      displayValue={true}
                    />
                  </div>

                  {/* Actions & Timestamps */}
                  <div className="pt-2 border-t border-[#cce7ed] flex items-center justify-between text-[11px] text-[#4a6870]">
                    <span>
                      {unit.printedCount > 0 ? `Printed (${unit.printedCount}x)` : "Not Printed"}
                    </span>

                    <div className="flex items-center gap-1">
                      {/* Reopen button if SOLD or DAMAGED */}
                      {!isAvailable && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResetUnitStatus(unit.id, "AVAILABLE");
                          }}
                          className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[10px] flex items-center gap-1 transition-all"
                          title="Reopen and make this serial barcode AVAILABLE again"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reopen</span>
                        </button>
                      )}

                      {/* Print button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPrintSingle(unit);
                        }}
                        className="px-2 py-1 rounded bg-white hover:bg-[#e3f2f5] text-[#056468] border border-[#cce7ed] font-medium text-[10px] flex items-center gap-1 transition-all"
                        title="Print Single Thermal Label"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Print</span>
                      </button>

                      {/* Delete individual available unit */}
                      {isAvailable && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSingleUnit(unit);
                          }}
                          className="p-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[10px] transition-all"
                          title="Remove this extra barcode and release serial number"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL 1: RECEIVE STOCK (+ GENERATE BARCODES) */}
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
                    className="px-5 py-2.5 bg-[#056468] hover:bg-[#044e51] text-white text-xs font-medium rounded-lg shadow-xs flex items-center gap-1.5"
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

      {/* MODAL 2: REDUCE / UNDO EXTRA STOCK & RELEASE SERIAL NUMBERS */}
      {reduceStockOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto pointer-events-auto">
          <div className="relative z-[10000] bg-white border border-amber-300 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-800 animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-200">
                  <Minus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Reduce Stock / Undo Entry
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Releases unused serial numbers for reuse
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReduceStockOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReduceStock} className="space-y-4 text-xs">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-1 text-amber-950">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Available Stock to Reduce: {availableCount} pcs</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Removing extra units will delete the highest-numbered unused barcodes (e.g. #{Math.max(1, availableCount - qtyToReduce + 1)} to #{availableCount}). Those serial numbers will be released for future stock receipts.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Number of Extra Units to Remove *
                </label>
                <input
                  type="number"
                  min="1"
                  max={availableCount}
                  required
                  value={qtyToReduce}
                  onChange={(e) => setQtyToReduce(Math.min(availableCount, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-full bg-slate-50 border-2 border-amber-300 rounded-xl px-3 py-2 text-lg text-amber-900 font-bold font-mono focus:outline-none focus:border-amber-600 bg-white"
                />
              </div>

              {/* Quick Presets */}
              <div>
                <span className="text-[11px] text-slate-500 font-semibold block mb-1">Quick Presets:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {[1, 5, 10, 20, availableCount].map((num, idx) => {
                    if (num <= 0 || num > availableCount) return null;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setQtyToReduce(num)}
                        className={`px-3 py-1 rounded-lg font-mono font-bold text-xs border transition-all ${
                          qtyToReduce === num
                            ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                            : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                        }`}
                      >
                        {num === availableCount ? `All (${num})` : `-${num}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason / Note</label>
                <input
                  type="text"
                  value={reduceReason}
                  onChange={(e) => setReduceReason(e.target.value)}
                  placeholder="e.g. Accidental extra quantity entered"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReduceStockOpen(false)}
                  disabled={reducingStock}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl bg-slate-100 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reducingStock || qtyToReduce <= 0 || availableCount === 0}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>{reducingStock ? "Removing Units..." : `Remove ${qtyToReduce} Units & Release Numbers`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT PRODUCT DETAILS MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto pointer-events-auto">
          <div className="relative z-[10000] bg-white border border-[#cce7ed] rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl text-[#0b252c] animate-in fade-in zoom-in-95 my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 shrink-0 bg-slate-50/50 rounded-t-2xl">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Edit className="w-4 h-4 text-[#056468]" />
                  <span>Edit Product & Variant Details</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update name, pricing, SKU, category, GST %, and e-commerce visibility.
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveProductDetails} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-xs">
                {/* SECTION 1: CORE PRODUCT DETAILS */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#056468] uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" />
                    <span>Basic Identification</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1">Product Title / Name *</label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={editForm.name}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-900 focus:outline-none focus:border-[#056468] focus:ring-1 focus:ring-[#056468]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">SKU (Stock Keeping Unit) *</label>
                      <input
                        type="text"
                        name="sku"
                        required
                        value={editForm.sku}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-[#056468] focus:outline-none focus:border-[#056468]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Brand Name</label>
                      <input
                        type="text"
                        name="brand"
                        value={editForm.brand}
                        onChange={handleFormChange}
                        placeholder="e.g. Starlet, Supreme, etc."
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-[#056468]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">HSN / SAC Code</label>
                      <input
                        type="text"
                        name="hsn"
                        value={editForm.hsn}
                        onChange={handleFormChange}
                        placeholder="e.g. 9405, 8504"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900 focus:outline-none focus:border-[#056468]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Vendor / Supplier</label>
                      <input
                        type="text"
                        name="vendor"
                        value={editForm.vendor}
                        onChange={handleFormChange}
                        placeholder="Supplier name"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-[#056468]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Status</label>
                      <select
                        name="status"
                        value={editForm.status}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-slate-800 bg-white"
                      >
                        <option value="ACTIVE">ACTIVE (Ready to Sell)</option>
                        <option value="OUT_OF_STOCK">OUT_OF_STOCK</option>
                        <option value="INACTIVE">INACTIVE / ARCHIVED</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Product Type</label>
                      <select
                        name="productType"
                        value={editForm.productType}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-slate-800 bg-white"
                      >
                        <option value="PRODUCT">PHYSICAL PRODUCT (Code 128 Unit Barcodes)</option>
                        <option value="SERVICE">SERVICE / REPAIR / JOBWORK</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: CATEGORY HIERARCHY */}
                <div className="space-y-3 pt-3 border-t border-slate-200">
                  <h4 className="text-xs font-bold text-[#056468] uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Category Hierarchy</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Main Category</label>
                      <select
                        name="categoryId"
                        value={editForm.categoryId}
                        onChange={(e) => {
                          handleFormChange(e);
                          setEditForm((prev) => ({ ...prev, categoryId: e.target.value, subCategoryId: "", level2CategoryId: "" }));
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-800 bg-white"
                      >
                        <option value="">-- None / General --</option>
                        {mainCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Sub-Category</label>
                      <select
                        name="subCategoryId"
                        value={editForm.subCategoryId}
                        disabled={!editForm.categoryId}
                        onChange={(e) => {
                          handleFormChange(e);
                          setEditForm((prev) => ({ ...prev, subCategoryId: e.target.value, level2CategoryId: "" }));
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-800 bg-white disabled:opacity-50"
                      >
                        <option value="">-- None --</option>
                        {subCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Level 2 Category</label>
                      <select
                        name="level2CategoryId"
                        value={editForm.level2CategoryId}
                        disabled={!editForm.subCategoryId}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-800 bg-white disabled:opacity-50"
                      >
                        <option value="">-- None --</option>
                        {level2Categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* SECTION 3: PRICING, TAXES & UNIT */}
                <div className="space-y-3 pt-3 border-t border-slate-200">
                  <h4 className="text-xs font-bold text-[#056468] uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Pricing, GST & Variant Unit</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">MRP (₹) *</label>
                      <input
                        type="number"
                        name="mrp"
                        step="0.01"
                        required
                        value={editForm.mrp}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 focus:outline-none focus:border-[#056468]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Selling / Offer (₹) *</label>
                      <input
                        type="number"
                        name="offerPrice"
                        step="0.01"
                        required
                        value={editForm.offerPrice}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-[#056468] focus:outline-none focus:border-[#056468]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Purchase Cost (₹)</label>
                      <input
                        type="number"
                        name="purchasePrice"
                        step="0.01"
                        value={editForm.purchasePrice}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 focus:outline-none focus:border-[#056468]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">GST Rate (%) *</label>
                      <select
                        name="gstPercent"
                        value={editForm.gstPercent}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 bg-white"
                      >
                        <option value="0">0% (Exempt)</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18% (Standard)</option>
                        <option value="28">28%</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Unit of Measure</label>
                      <select
                        name="unit"
                        value={editForm.unit}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-slate-800 bg-white"
                      >
                        <option value="PCS">PCS (Pieces)</option>
                        <option value="BOX">BOX</option>
                        <option value="SET">SET</option>
                        <option value="MTR">MTR (Meters)</option>
                        <option value="KG">KG (Kilograms)</option>
                        <option value="PAIR">PAIR</option>
                        <option value="PACK">PACK</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Color (Optional)</label>
                      <input
                        type="text"
                        name="color"
                        value={editForm.color}
                        onChange={handleFormChange}
                        placeholder="e.g. Warm White, Black"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Size (Optional)</label>
                      <input
                        type="text"
                        name="size"
                        value={editForm.size}
                        onChange={handleFormChange}
                        placeholder="e.g. 5m, Standard, 12W"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Website Badge</label>
                      <input
                        type="text"
                        name="badge"
                        value={editForm.badge}
                        onChange={handleFormChange}
                        placeholder="e.g. Best Seller, Hot, New"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 4: E-COMMERCE & VISIBILITY */}
                <div className="space-y-3 pt-3 border-t border-slate-200">
                  <h4 className="text-xs font-bold text-[#056468] uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Website & Online Catalog Settings</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        name="showOnWebsite"
                        checked={editForm.showOnWebsite}
                        onChange={handleFormChange}
                        className="w-4 h-4 rounded text-[#056468] focus:ring-[#056468]"
                      />
                      <div>
                        <div className="font-bold text-slate-900">Show on Online Website</div>
                        <div className="text-[11px] text-slate-500">Enable visibility on store frontend</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        name="featured"
                        checked={editForm.featured}
                        onChange={handleFormChange}
                        className="w-4 h-4 rounded text-[#056468] focus:ring-[#056468]"
                      />
                      <div>
                        <div className="font-bold text-slate-900">Feature on Homepage</div>
                        <div className="text-[11px] text-slate-500">Promote in featured carousel</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* SECTION 5: MEDIA & DESCRIPTION */}
                <div className="space-y-3 pt-3 border-t border-slate-200">
                  <h4 className="text-xs font-bold text-[#056468] uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Image & Description</span>
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Product Image</label>
                      <div className="flex items-center gap-3">
                        {editForm.imageUrl ? (
                          <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                            <img src={editForm.imageUrl} alt="preview" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                            <ImageIcon className="w-6 h-6" />
                          </div>
                        )}
                        <div className="flex-1 space-y-1.5">
                          <input
                            type="text"
                            name="imageUrl"
                            value={editForm.imageUrl}
                            onChange={handleFormChange}
                            placeholder="Image URL or upload below..."
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono text-xs text-slate-900"
                          />
                          <label className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer text-slate-700 font-medium text-[11px]">
                            <Upload className="w-3 h-3 text-[#056468]" />
                            <span>{uploadingImage ? "Uploading..." : "Upload New Image"}</span>
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Search Tags (comma-separated)</label>
                      <input
                        type="text"
                        name="tags"
                        value={editForm.tags}
                        onChange={handleFormChange}
                        placeholder="e.g. lighting, led, strip, neon, interior"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Description & Specifications</label>
                      <textarea
                        name="description"
                        rows={3}
                        value={editForm.description}
                        onChange={handleFormChange}
                        placeholder="Write detailed product specifications, features, warranty..."
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-[#056468]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="border-t border-slate-200 px-6 py-3.5 bg-slate-50 flex items-center justify-end gap-3 shrink-0 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 rounded-xl bg-[#056468] hover:bg-[#044e51] text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? "Saving..." : "Save Product Details"}</span>
                </button>
              </div>
            </form>
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
