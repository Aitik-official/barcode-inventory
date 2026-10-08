"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Package,
  FolderTree,
  Wrench,
  Plus,
  FolderPlus,
  Search,
  Globe,
  Eye,
  EyeOff,
  ChevronRight,
  Tag,
  SlidersHorizontal,
  Zap,
  Printer,
  ScanBarcode,
  CheckCircle2,
  X,
  Trash2,
} from "lucide-react";
import { PrintLabelDialog } from "@/components/PrintLabelDialog";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";
import { BarcodeSvg } from "@/components/BarcodeSvg";
import { Pagination } from "@/components/Pagination";

export default function ProductsClient({
  products,
  categories,
  initialSearch,
  initialCategoryId,
}: {
  products: any[];
  categories: any[];
  initialSearch: string;
  initialCategoryId: string;
}) {
  const [activeTab, setActiveTab] = useState<"products" | "categories" | "services">("products");

  // Main Category Modal State
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catName, setCatName] = useState("");
  const [catParentId, setCatParentId] = useState("");
  const [catMainUse, setCatMainUse] = useState("product");
  const [catDesc, setCatDesc] = useState("");
  const [catLoading, setCatLoading] = useState(false);
  const [modalTitle, setModalTitle] = useState("📁 Create Main Category");

  // Toggle website visibility switch
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);

  // Quick Refill Stock & Barcodes State (Single Product)
  const [refillProduct, setRefillProduct] = useState<any | null>(null);
  const [refillQty, setRefillQty] = useState<number>(10);
  const [refillLoading, setRefillLoading] = useState(false);
  const [refillStep, setRefillStep] = useState<"input" | "success">("input");
  const [generatedBarcodes, setGeneratedBarcodes] = useState<string[]>([]);

  // Bulk Multi-Product Refill & Print State
  const [bulkRefillOpen, setBulkRefillOpen] = useState(false);
  const [bulkStep, setBulkStep] = useState<"input" | "success">("input");
  const [bulkItems, setBulkItems] = useState<
    Array<{
      id: string;
      variantId: string;
      name: string;
      sku: string;
      price: number;
      currentStock: number;
      qty: number;
      selected: boolean;
    }>
  >([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  const [bulkResults, setBulkResults] = useState<
    Array<{
      productId: string;
      name: string;
      sku: string;
      price: number;
      barcodes: string[];
      count: number;
    }>
  >([]);

  // Print Dialog State
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printBarcodesList, setPrintBarcodesList] = useState<string[]>([]);
  const [printSingleUnit, setPrintSingleUnit] = useState<string>("");
  const [printItemsList, setPrintItemsList] = useState<any[]>([]);

  // Product List & Safety Delete State
  const [productList, setProductList] = useState<any[]>(products);
  const [productToDelete, setProductToDelete] = useState<any | null>(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeletingProduct(true);
    try {
      const res = await fetch(`/api/products/${productToDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setProductList((prev) => prev.filter((p) => p.id !== productToDelete.id));
        setProductToDelete(null);
      } else {
        alert(data.error || "Failed to delete product");
      }
    } catch (err: any) {
      alert("Delete Error: " + err.message);
    } finally {
      setIsDeletingProduct(false);
    }
  };

  const openRefillStock = (product: any) => {
    setRefillProduct(product);
    setRefillQty(10);
    setRefillStep("input");
    setGeneratedBarcodes([]);
    setPrintItemsList([]);
  };

  const openBulkRefillModal = () => {
    const physicalProducts = products.filter((p) => p.productType !== "SERVICE");
    const items = physicalProducts.map((p) => {
      const v = p.variants?.[0];
      return {
        id: p.id,
        variantId: v?.id || "",
        name: p.name,
        sku: v?.sku || "SKU",
        price: p.offerPrice || v?.sellingPrice || 0,
        currentStock: v?.inventory?.quantity || 0,
        qty: 10,
        selected: true,
      };
    });
    setBulkItems(items);
    setBulkStep("input");
    setBulkResults([]);
    setBulkRefillOpen(true);
  };

  const toggleSelectAllBulk = (checked: boolean) => {
    setBulkItems((prev) => prev.map((item) => ({ ...item, selected: checked })));
  };

  const setAllBulkQty = (qty: number) => {
    setBulkItems((prev) => prev.map((item) => ({ ...item, qty })));
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selected = bulkItems.filter((item) => item.selected && item.qty > 0 && item.variantId);
    if (selected.length === 0) {
      alert("Please select at least one product with quantity > 0");
      return;
    }

    setBulkProcessing(true);
    setBulkProgress({ current: 0, total: selected.length });
    const results: Array<{
      productId: string;
      name: string;
      sku: string;
      price: number;
      barcodes: string[];
      count: number;
    }> = [];

    try {
      for (let i = 0; i < selected.length; i++) {
        const item = selected[i];
        setBulkProgress({ current: i + 1, total: selected.length });

        const res = await fetch("/api/barcodes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productVariantId: item.variantId,
            quantity: item.qty,
            note: `Bulk multi-refill +${item.qty} units`,
          }),
        });

        const data = await res.json();
        if (res.ok && data.barcodes) {
          results.push({
            productId: item.id,
            name: item.name,
            sku: item.sku,
            price: item.price,
            barcodes: data.barcodes,
            count: data.barcodes.length,
          });
        }
      }

      setBulkResults(results);
      setBulkStep("success");
    } catch (err: any) {
      alert("Error during bulk generation: " + err.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleMasterBatchPrint = () => {
    if (bulkResults.length === 0) return;
    const allItems: any[] = [];
    bulkResults.forEach((res) => {
      res.barcodes.forEach((b, idx) => {
        allItems.push({
          productName: res.name,
          sku: res.sku,
          price: res.price,
          barcode: b,
          serialNumber: idx + 1,
        });
      });
    });

    setPrintItemsList(allItems);
    setPrintBarcodesList([]);
    setPrintModalOpen(true);
  };

  const handleRefillStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refillProduct) return;
    const variant = refillProduct.variants?.[0];
    if (!variant) {
      alert("Product has no default variant. Please create a variant first.");
      return;
    }

    setRefillLoading(true);
    try {
      const res = await fetch("/api/barcodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productVariantId: variant.id,
          quantity: refillQty,
          note: `Refilled +${refillQty} units from Product Catalog`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to refill stock & generate barcodes");
      }

      setGeneratedBarcodes(data.barcodes || []);
      setRefillStep("success");
    } catch (err: any) {
      alert("Refill Error: " + err.message);
    } finally {
      setRefillLoading(false);
    }
  };

  const handleBatchPrint = () => {
    if (!refillProduct || generatedBarcodes.length === 0) return;
    setPrintBarcodesList(generatedBarcodes);
    setPrintItemsList([]);
    setPrintSingleUnit("");
    setPrintModalOpen(true);
  };

  const toggleWebsiteVisibility = async (productId: string, currentShow: boolean) => {
    setToggleLoading(productId);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showOnWebsite: !currentShow }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setToggleLoading(null);
    }
  };

  // Service Modal State
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("499");
  const [serviceCategoryId, setServiceCategoryId] = useState("");
  const [serviceDesc, setServiceDesc] = useState("");
  const [serviceImageUrl, setServiceImageUrl] = useState("");
  const [serviceShowOnWebsite, setServiceShowOnWebsite] = useState(true);
  const [serviceUploading, setServiceUploading] = useState(false);
  const [serviceLoading, setServiceLoading] = useState(false);

  const openCreateModal = (title: string, defaultParentId: string = "") => {
    setModalTitle(title);
    setCatParentId(defaultParentId);
    setCatName("");
    setCatDesc("");
    setCatModalOpen(true);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    setCatLoading(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: catName,
          parentId: catParentId || null,
          mainUse: catMainUse,
          description: catDesc,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create category");
      }

      setCatModalOpen(false);
      setCatName("");
      setCatDesc("");
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCatLoading(false);
    }
  };

  const handleServiceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setServiceUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setServiceImageUrl(data.url);
    } catch (err: any) {
      alert("Cloudinary Upload Error: " + err.message);
    } finally {
      setServiceUploading(false);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) return;

    setServiceLoading(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: serviceName.trim(),
          description: serviceDesc,
          imageUrl: serviceImageUrl,
          categoryId: serviceCategoryId || null,
          offerPrice: Number(servicePrice) || 0,
          mrp: Number(servicePrice) || 0,
          productType: "SERVICE",
          showOnWebsite: serviceShowOnWebsite,
          initialQuantity: 0,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create service");
      }

      setServiceModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setServiceLoading(false);
    }
  };

  // Level 1 Categories (Main Categories)
  const mainCategories = useMemo(() => categories.filter((c) => !c.parentId), [categories]);

  // Level 2 Categories (Sub Categories)
  const subCategories = useMemo(
    () => categories.filter((c) => c.parentId && mainCategories.some((m) => m.id === c.parentId)),
    [categories, mainCategories]
  );

  // Level 3 Categories (Level 2 Sub Categories)
  const level2SubCategories = useMemo(
    () => categories.filter((c) => c.parentId && subCategories.some((s) => s.id === c.parentId)),
    [categories, subCategories]
  );

  const serviceCategories = useMemo(() => categories.filter((c) => c.mainUse === "service"), [categories]);

  // Pagination States
  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(12);

  const [mainCatPage, setMainCatPage] = useState(1);
  const [mainCatPageSize, setMainCatPageSize] = useState(10);

  const [subCatPage, setSubCatPage] = useState(1);
  const [subCatPageSize, setSubCatPageSize] = useState(10);

  const [l2CatPage, setL2CatPage] = useState(1);
  const [l2CatPageSize, setL2CatPageSize] = useState(10);

  const [servicesPage, setServicesPage] = useState(1);
  const [servicesPageSize, setServicesPageSize] = useState(12);

  // Paginated Slices
  const paginatedProducts = useMemo(() => {
    const start = (productPage - 1) * productPageSize;
    return productList.slice(start, start + productPageSize);
  }, [productList, productPage, productPageSize]);

  const paginatedMainCategories = useMemo(() => {
    const start = (mainCatPage - 1) * mainCatPageSize;
    return mainCategories.slice(start, start + mainCatPageSize);
  }, [mainCategories, mainCatPage, mainCatPageSize]);

  const paginatedSubCategories = useMemo(() => {
    const start = (subCatPage - 1) * subCatPageSize;
    return subCategories.slice(start, start + subCatPageSize);
  }, [subCategories, subCatPage, subCatPageSize]);

  const paginatedL2SubCategories = useMemo(() => {
    const start = (l2CatPage - 1) * l2CatPageSize;
    return level2SubCategories.slice(start, start + l2CatPageSize);
  }, [level2SubCategories, l2CatPage, l2CatPageSize]);

  const serviceProducts = useMemo(() => {
    return products.filter((p) => p.productType === "SERVICE");
  }, [products]);

  const paginatedServices = useMemo(() => {
    const start = (servicesPage - 1) * servicesPageSize;
    return serviceProducts.slice(start, start + servicesPageSize);
  }, [serviceProducts, servicesPage, servicesPageSize]);

  return (
    <div className="space-y-6 py-2">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#cce7ed] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#0b252c] flex items-center gap-2">
            <Package className="w-5 h-5 text-[#056468]" />
            <span>Products & 3-Tier Catalog Hierarchy</span>
          </h1>
          <p className="text-xs text-[#4a6870] mt-1 font-normal">
            Manage master products, 3-tier category hierarchy, SKUs, and per-unit serial barcodes.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={openBulkRefillModal}
            className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Bulk Refill & Print</span>
          </button>
          <button
            type="button"
            onClick={() => openCreateModal("Create Main Category", "")}
            className="px-3.5 py-2 rounded-lg bg-white hover:bg-[#f0f8fa] active:scale-95 text-[#056468] font-semibold text-xs border border-[#cce7ed] shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
          <Link
            href="/products/new"
            className="px-4 py-2 rounded-lg bg-[#056468] hover:bg-[#044e51] active:scale-95 text-white font-medium text-xs shadow transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Product</span>
          </Link>
        </div>
      </div>

      {/* Module Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-[#cce7ed] pb-2">
        <button
          onClick={() => setActiveTab("products")}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
            activeTab === "products"
              ? "bg-[#056468] text-white font-semibold shadow-sm"
              : "text-[#4a6870] hover:text-[#0b252c] hover:bg-white/60"
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Products List ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("categories")}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
            activeTab === "categories"
              ? "bg-[#056468] text-white font-semibold shadow-sm"
              : "text-[#4a6870] hover:text-[#0b252c] hover:bg-white/60"
          }`}
        >
          <FolderTree className="w-3.5 h-3.5" />
          <span>3-Tier Categories ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("services")}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
            activeTab === "services"
              ? "bg-[#056468] text-white font-semibold shadow-sm"
              : "text-[#4a6870] hover:text-[#0b252c] hover:bg-white/60"
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Services & Printing ({products.filter((p) => p.productType === "SERVICE").length})</span>
        </button>
      </div>

      {/* TAB 1: PRODUCTS LIST */}
      {activeTab === "products" && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <form method="GET" className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-[#5f818b]" />
              <input
                type="text"
                name="search"
                defaultValue={initialSearch}
                placeholder="Search products by name, SKU, brand, or vendor..."
                className="w-full bg-white border border-[#cce7ed] rounded-lg pl-9 pr-4 py-2 text-xs text-[#0b252c] placeholder-[#6a8c96] focus:outline-none focus:ring-2 focus:ring-[#056468]"
              />
            </div>
            <select
              name="categoryId"
              defaultValue={initialCategoryId}
              className="bg-white border border-[#cce7ed] rounded-lg px-3 py-2 text-xs text-[#0b252c] focus:outline-none focus:ring-2 focus:ring-[#056468]"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parent ? `${c.parent.name} → ` : ""}{c.name} ({c.mainUse})
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-white hover:bg-[#f0f8fa] text-[#056468] font-medium text-xs rounded-lg border border-[#cce7ed] transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filter</span>
            </button>
          </form>

          {/* Products Grid */}
          {products.length === 0 ? (
            <div className="bg-white border border-[#cce7ed] rounded-xl p-12 text-center space-y-4 shadow-sm">
              <Package className="w-12 h-12 text-[#056468] mx-auto opacity-70" />
              <h3 className="text-base font-semibold text-[#0b252c]">No products found</h3>
              <p className="text-xs text-[#4a6870] max-w-sm mx-auto font-normal">
                Get started by adding your first product with SKU and initial per-unit barcodes.
              </p>
              <Link
                href="/products/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#056468] text-white font-medium text-xs shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Product Now</span>
              </Link>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {paginatedProducts.map((product) => {
                  const variant = product.variants[0];
                  const stockQty = variant?.inventory?.quantity ?? 0;
                  const unitBarcodes = variant?.unitBarcodes || [];

                  return (
                    <div
                      key={product.id}
                      className="bg-[#056468] text-white rounded-xl p-5 shadow-md hover:shadow-lg transition-all border border-[#044e51] flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        {/* Product Header & Image */}
                        <div className="flex items-start gap-3">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-13 h-13 object-cover rounded-lg border border-white/20 shrink-0 bg-white/10"
                            />
                          ) : (
                            <div className="w-13 h-13 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-emerald-200 shrink-0">
                              <Package className="w-6 h-6" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-medium bg-white/15 px-2 py-0.5 rounded text-emerald-100 border border-white/10">
                                {product.category?.name || "General"}
                              </span>
                              {product.productType === "SERVICE" && (
                                <span className="text-[10px] font-medium bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded border border-amber-300/30">
                                  Service
                                </span>
                              )}
                            </div>
                            <h2 className="text-base font-semibold text-white mt-1 leading-snug truncate">
                              {product.name}
                            </h2>
                          </div>
                        </div>

                        {/* Website Visibility Toggle Button */}
                        <button
                          type="button"
                          onClick={() => toggleWebsiteVisibility(product.id, product.showOnWebsite ?? true)}
                          disabled={toggleLoading === product.id}
                          className={`w-full py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-between border ${
                            (product.showOnWebsite ?? true)
                              ? "bg-white/15 border-white/20 text-white hover:bg-white/25"
                              : "bg-rose-950/40 border-rose-400/40 text-rose-200 hover:bg-rose-950/60"
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-emerald-200" />
                            <span>Website Status:</span>
                          </span>
                          <span className="font-semibold text-[11px] flex items-center gap-1">
                            {toggleLoading === product.id ? (
                              "Updating..."
                            ) : (product.showOnWebsite ?? true) ? (
                              <>
                                <Eye className="w-3 h-3 text-emerald-300" /> Visible
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3 h-3 text-rose-300" /> Hidden
                              </>
                            )}
                          </span>
                        </button>

                        {/* Price & Stock Container */}
                        <div className="grid grid-cols-2 gap-2 bg-black/15 p-3 rounded-lg border border-white/10 text-xs">
                          <div>
                            <div className="text-emerald-100/70 text-[10px] font-normal">Offer Price</div>
                            <div className="font-bold text-white text-base">
                              ₹{(product.offerPrice || variant?.sellingPrice || 0).toFixed(2)}
                            </div>
                            {product.mrp > product.offerPrice && (
                              <div className="line-through text-emerald-200/60 text-[10px]">
                                MRP ₹{product.mrp}
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-emerald-100/70 text-[10px] font-normal">In Stock</div>
                            <div className="font-bold text-emerald-200 text-base">
                              {stockQty} Units
                            </div>
                            <div className="text-emerald-100/70 text-[10px]">Per-Unit Serialized</div>
                          </div>
                        </div>

                        {/* SKU Info */}
                        {variant && (
                          <div className="space-y-1 text-xs text-emerald-100/90 font-normal">
                            <div className="flex items-center justify-between">
                              <span>SKU Code:</span>
                              <span className="font-mono font-medium text-white">{variant.sku}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>Barcode Tag:</span>
                              <span className="font-mono text-[11px] text-emerald-200 truncate max-w-[170px]">
                                {unitBarcodes.length > 0
                                  ? `${unitBarcodes[0].barcode}..`
                                  : "No units generated"}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Action */}
                      <div className="pt-3 border-t border-white/15 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => openRefillStock(product)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-[#043e41] font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <Zap className="w-3.5 h-3.5 fill-current" />
                          <span>Refill</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/products/${product.id}`}
                            className="px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white text-white hover:text-[#056468] font-semibold text-xs transition-all flex items-center gap-1 border border-white/20"
                          >
                            <span>Details</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => setProductToDelete(product)}
                            className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-white font-semibold text-xs transition-all border border-rose-400/30"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Pagination
                currentPage={productPage}
                totalItems={productList.length}
                pageSize={productPageSize}
                onPageChange={setProductPage}
                onPageSizeChange={setProductPageSize}
                pageSizeOptions={[9, 12, 24, 48, 96]}
                itemLabel="products"
                className="mt-4 border border-[#cce7ed] rounded-xl shadow-xs"
              />
            </div>
          )}
        </div>
      )}

      {/* TAB 2: 3-TIER CATEGORIES */}
      {activeTab === "categories" && (
        <div className="space-y-6">
          {/* Action Header for Categories */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#cce7ed] p-4 rounded-xl shadow-sm">
            <div>
              <h2 className="text-sm font-semibold text-[#0b252c]">3-Tier Category Structure</h2>
              <p className="text-xs text-[#4a6870] font-normal">
                1. Main Category → 2. Sub-Category → 3. Level 2 Sub-Category
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openCreateModal("Create Main Category (Level 1)", "")}
                className="px-3 py-1.5 bg-[#056468] hover:bg-[#044e51] text-white font-medium text-xs rounded-lg shadow-sm"
              >
                + Main Category
              </button>
              <button
                onClick={() => openCreateModal("Create Sub-Category (Level 2)", mainCategories[0]?.id || "")}
                className="px-3 py-1.5 bg-[#028090] hover:bg-[#026c7a] text-white font-medium text-xs rounded-lg shadow-sm"
              >
                + Sub-Category
              </button>
              <button
                onClick={() => openCreateModal("Create Level 2 Sub-Category (Level 3)", subCategories[0]?.id || "")}
                className="px-3 py-1.5 bg-[#00a896] hover:bg-[#008f80] text-white font-medium text-xs rounded-lg shadow-sm"
              >
                + Level 2 Sub-Category
              </button>
            </div>
          </div>

          {/* Level 1: Main Categories */}
          <div className="bg-white border border-[#cce7ed] rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold text-[#056468] uppercase tracking-wider flex items-center justify-between border-b border-[#cce7ed] pb-2">
              <span>Level 1: Main Categories ({mainCategories.length})</span>
            </h3>

            <div className="overflow-x-auto rounded-lg border border-[#cce7ed]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f0f8fa] text-[#0b252c] font-semibold uppercase tracking-wider border-b border-[#cce7ed]">
                  <tr>
                    <th className="p-3">Category Name</th>
                    <th className="p-3">Slug</th>
                    <th className="p-3">Main Use</th>
                    <th className="p-3">Sub-Categories Count</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#cce7ed] text-[#0b252c] font-normal">
                  {paginatedMainCategories.map((c) => {
                    const subCount = subCategories.filter((s) => s.parentId === c.id).length;
                    return (
                      <tr key={c.id} className="hover:bg-[#f8fcfe]">
                        <td className="p-3 font-semibold text-[#0b252c]">{c.name}</td>
                        <td className="p-3 text-[#5f818b] font-mono text-[11px]">{c.slug}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                              c.mainUse === "product"
                                ? "bg-[#e3f2f5] text-[#056468] border border-[#b2dce5]"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {c.mainUse.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-[#056468]">{subCount} Sub-Categories</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => openCreateModal(`Add Sub-Category under ${c.name}`, c.id)}
                            className="px-2.5 py-1 bg-white hover:bg-[#f0f8fa] text-[#056468] font-medium text-[11px] rounded border border-[#cce7ed]"
                          >
                            + Add Sub-Category
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <Pagination
                currentPage={mainCatPage}
                totalItems={mainCategories.length}
                pageSize={mainCatPageSize}
                onPageChange={setMainCatPage}
                onPageSizeChange={setMainCatPageSize}
                itemLabel="main categories"
              />
            </div>
          </div>

          {/* Level 2: Sub-Categories */}
          <div className="bg-white border border-[#cce7ed] rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold text-[#028090] uppercase tracking-wider flex items-center justify-between border-b border-[#cce7ed] pb-2">
              <span>Level 2: Sub-Categories ({subCategories.length})</span>
            </h3>

            <div className="overflow-x-auto rounded-lg border border-[#cce7ed]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f0f8fa] text-[#0b252c] font-semibold uppercase tracking-wider border-b border-[#cce7ed]">
                  <tr>
                    <th className="p-3">Sub-Category Name</th>
                    <th className="p-3">Parent Main Category</th>
                    <th className="p-3">Slug</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#cce7ed] text-[#0b252c] font-normal">
                  {subCategories.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-[#5f818b]">
                        No Level 2 Sub-Categories created yet. Click + Sub-Category above.
                      </td>
                    </tr>
                  ) : (
                    paginatedSubCategories.map((sc) => {
                      const parentCat = mainCategories.find((m) => m.id === sc.parentId);
                      return (
                        <tr key={sc.id} className="hover:bg-[#f8fcfe]">
                          <td className="p-3 font-semibold text-[#0b252c]">{sc.name}</td>
                          <td className="p-3 text-[#056468] font-medium">
                            {parentCat?.name || "Main Category"}
                          </td>
                          <td className="p-3 text-[#5f818b] font-mono text-[11px]">{sc.slug}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => openCreateModal(`Add Level 2 Sub-Category under ${sc.name}`, sc.id)}
                              className="px-2.5 py-1 bg-white hover:bg-[#f0f8fa] text-[#028090] font-medium text-[11px] rounded border border-[#cce7ed]"
                            >
                              + Add Level 2 Sub-Category
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              <Pagination
                currentPage={subCatPage}
                totalItems={subCategories.length}
                pageSize={subCatPageSize}
                onPageChange={setSubCatPage}
                onPageSizeChange={setSubCatPageSize}
                itemLabel="sub-categories"
              />
            </div>
          </div>

          {/* Level 3: Level 2 Sub-Categories */}
          <div className="bg-white border border-[#cce7ed] rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-semibold text-[#00a896] uppercase tracking-wider flex items-center justify-between border-b border-[#cce7ed] pb-2">
              <span>Level 3: Level 2 Sub-Categories ({level2SubCategories.length})</span>
            </h3>

            <div className="overflow-x-auto rounded-lg border border-[#cce7ed]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f0f8fa] text-[#0b252c] font-semibold uppercase tracking-wider border-b border-[#cce7ed]">
                  <tr>
                    <th className="p-3">Level 2 Sub-Category Name</th>
                    <th className="p-3">Parent Sub-Category</th>
                    <th className="p-3">Slug</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#cce7ed] text-[#0b252c] font-normal">
                  {level2SubCategories.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-[#5f818b]">
                        No Level 3 Sub-Categories created yet. Click + Level 2 Sub-Category above.
                      </td>
                    </tr>
                  ) : (
                    paginatedL2SubCategories.map((l2) => {
                      const parentSub = subCategories.find((s) => s.id === l2.parentId);
                      return (
                        <tr key={l2.id} className="hover:bg-[#f8fcfe]">
                          <td className="p-3 font-semibold text-[#0b252c]">{l2.name}</td>
                          <td className="p-3 text-[#00a896] font-medium">
                            {parentSub?.name || "Sub Category"}
                          </td>
                          <td className="p-3 text-[#5f818b] font-mono text-[11px]">{l2.slug}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              <Pagination
                currentPage={l2CatPage}
                totalItems={level2SubCategories.length}
                pageSize={l2CatPageSize}
                onPageChange={setL2CatPage}
                onPageSizeChange={setL2CatPageSize}
                itemLabel="level 2 sub-categories"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SERVICES & PRINTING */}
      {activeTab === "services" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white border border-[#cce7ed] p-5 rounded-xl shadow-sm">
            <div>
              <h2 className="text-base font-semibold text-[#0b252c] flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[#056468]" />
                <span>Services & Custom Printing Catalog</span>
              </h2>
              <p className="text-xs text-[#4a6870] font-normal mt-0.5">
                Services (e.g. Thermal Label Printing, Zebra Printer Maintenance, Roll Die-Cutting) are enquiry-based.
              </p>
            </div>
            <button
              onClick={() => setServiceModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-[#056468] hover:bg-[#044e51] text-white font-medium text-xs shadow flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Custom Service</span>
            </button>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {serviceProducts.length === 0 ? (
              <div className="col-span-3 bg-white border border-[#cce7ed] rounded-xl p-12 text-center space-y-4 shadow-sm">
                <Wrench className="w-12 h-12 text-[#056468] mx-auto opacity-70" />
                <h3 className="text-base font-semibold text-[#0b252c]">No custom services created yet</h3>
                <p className="text-xs text-[#4a6870] max-w-md mx-auto font-normal">
                  Click "Create Custom Service" above to add printing services, label customization, or maintenance contracts with Cloudinary images & website toggle.
                </p>
                <button
                  onClick={() => setServiceModalOpen(true)}
                  className="px-4 py-2 rounded-lg bg-[#056468] text-white font-medium text-xs shadow"
                >
                  Create Custom Service
                </button>
              </div>
            ) : (
              paginatedServices.map((srv) => (
                <div
                  key={srv.id}
                  className="bg-[#056468] text-white rounded-xl p-5 shadow-md hover:shadow-lg transition-all border border-[#044e51] flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      {srv.imageUrl ? (
                        <img
                          src={srv.imageUrl}
                          alt={srv.name}
                          className="w-13 h-13 object-cover rounded-lg border border-white/20 shrink-0 bg-white/10"
                        />
                      ) : (
                        <div className="w-13 h-13 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-emerald-200 shrink-0">
                          <Wrench className="w-6 h-6" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-medium bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded border border-amber-300/30">
                          {srv.category?.name || "Printing Service"}
                        </span>
                        <h3 className="text-base font-semibold text-white mt-1 leading-snug truncate">
                          {srv.name}
                        </h3>
                      </div>
                    </div>

                    <p className="text-xs text-emerald-100/80 line-clamp-2 font-normal">
                      {srv.description || "Custom printing, die-cutting, & office labeling services."}
                    </p>

                    <div className="bg-black/15 p-3 rounded-lg border border-white/10 flex items-center justify-between text-xs">
                      <span className="text-emerald-100/70 font-normal">Estimated Price:</span>
                      <span className="font-bold text-white text-sm">
                        ₹{srv.offerPrice || srv.mrp || 0} / job
                      </span>
                    </div>

                    {/* Live Website Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleWebsiteVisibility(srv.id, srv.showOnWebsite ?? true)}
                      disabled={toggleLoading === srv.id}
                      className={`w-full py-1.5 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-between border ${
                        (srv.showOnWebsite ?? true)
                          ? "bg-white/15 border-white/20 text-white hover:bg-white/25"
                          : "bg-rose-950/40 border-rose-400/40 text-rose-200 hover:bg-rose-950/60"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-emerald-200" />
                        <span>Website Status:</span>
                      </span>
                      <span className="font-semibold text-[11px] flex items-center gap-1">
                        {toggleLoading === srv.id ? (
                          "Updating..."
                        ) : (srv.showOnWebsite ?? true) ? (
                          <>
                            <Eye className="w-3 h-3 text-emerald-300" /> Visible
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3 text-rose-300" /> Hidden
                          </>
                        )}
                      </span>
                    </button>
                  </div>

                  <div className="pt-3 border-t border-white/15 flex items-center justify-between">
                    <span className="text-[11px] text-emerald-100/70 font-normal">Enquiry Based</span>
                    <Link
                      href="/orders"
                      className="px-3 py-1.5 bg-white text-[#056468] hover:bg-emerald-50 font-semibold text-xs rounded-lg transition-all flex items-center gap-1"
                    >
                      <span>Create Enquiry</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          <Pagination
            currentPage={servicesPage}
            totalItems={serviceProducts.length}
            pageSize={servicesPageSize}
            pageSizeOptions={[6, 12, 24, 48]}
            onPageChange={setServicesPage}
            onPageSizeChange={setServicesPageSize}
          />
        </div>
      )}

      {/* Create Category Modal */}
      {catModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto pointer-events-auto">
          <div className="relative z-[10000] bg-white border border-[#cce7ed] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 text-[#0b252c]">
            <h3 className="text-base font-semibold text-[#0b252c] border-b border-[#cce7ed] pb-3">{modalTitle}</h3>

            <form onSubmit={handleCreateCategory} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#0b252c] mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Thermal Paper Supplies"
                  className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-lg px-3 py-2 text-[#0b252c] focus:outline-none focus:ring-2 focus:ring-[#056468] text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-[#0b252c] mb-1">Parent Category (For Sub-Categories)</label>
                <select
                  value={catParentId}
                  onChange={(e) => setCatParentId(e.target.value)}
                  className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-lg px-3 py-2 text-[#0b252c] text-xs"
                >
                  <option value="">None (Top-Level Main Category)</option>
                  <optgroup label="Main Categories (Level 1)">
                    {mainCategories.map((m) => (
                      <option key={m.id} value={m.id}>
                        Main: {m.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Sub-Categories (Level 2)">
                    {subCategories.map((s) => (
                      <option key={s.id} value={s.id}>
                        Sub: {s.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#0b252c] mb-1">Main Use</label>
                <select
                  value={catMainUse}
                  onChange={(e) => setCatMainUse(e.target.value)}
                  className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-lg px-3 py-2 text-[#0b252c] text-xs"
                >
                  <option value="product">Product (Physical Catalog & Inventory)</option>
                  <option value="service">Service (Enquiry & B2B Quote)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#0b252c] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Short category summary..."
                  className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-lg px-3 py-2 text-[#0b252c] text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#cce7ed]">
                <button
                  type="button"
                  onClick={() => setCatModalOpen(false)}
                  className="px-4 py-2 font-medium text-[#4a6870] hover:text-[#0b252c]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={catLoading}
                  className="px-4 py-2 bg-[#056468] hover:bg-[#044e51] text-white font-medium rounded-lg shadow-sm"
                >
                  {catLoading ? "Saving..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Custom Service Modal */}
      {serviceModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto pointer-events-auto">
          <div className="relative z-[10000] bg-white border border-[#cce7ed] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-[#0b252c]">
            <div className="flex items-center justify-between border-b border-[#cce7ed] pb-3">
              <h3 className="text-base font-semibold text-[#0b252c] flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#056468]" />
                <span>Create Custom Service</span>
              </h3>
              <button
                onClick={() => setServiceModalOpen(false)}
                className="text-[#5f818b] hover:text-[#0b252c] text-base"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateService} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#0b252c] mb-1">Service Title / Name *</label>
                <input
                  type="text"
                  required
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="e.g. Custom Thermal Barcode Sticker Printing (Rolls)"
                  className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-lg px-3 py-2 text-[#0b252c] focus:outline-none focus:ring-2 focus:ring-[#056468] text-xs"
                />
              </div>

              {/* Service Image (Cloudinary) */}
              <div className="bg-[#f0f8fa] p-3 rounded-lg border border-[#cce7ed] space-y-2">
                <label className="block font-medium text-[#056468]">Service Image (Cloudinary Folder: barcode-inventory)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleServiceImageUpload}
                  disabled={serviceUploading}
                  className="text-xs text-[#4a6870] file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#056468] file:text-white"
                />
                {serviceUploading && <span className="text-xs text-[#056468] font-medium animate-pulse block">Uploading image...</span>}
                {serviceImageUrl && (
                  <div className="flex items-center gap-3 pt-1">
                    <img src={serviceImageUrl} alt="Service preview" className="w-12 h-12 object-cover rounded-lg border border-[#056468]" />
                    <span className="text-[11px] font-mono text-emerald-700 truncate max-w-xs">✓ Image uploaded</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-[#0b252c] mb-1">Service Category</label>
                  <select
                    value={serviceCategoryId}
                    onChange={(e) => setServiceCategoryId(e.target.value)}
                    className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-lg px-3 py-2 text-[#0b252c] text-xs"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.mainUse})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-[#0b252c] mb-1">Base Estimated Price (₹)</label>
                  <input
                    type="number"
                    value={servicePrice}
                    onChange={(e) => setServicePrice(e.target.value)}
                    placeholder="499"
                    className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-lg px-3 py-2 text-[#0b252c] font-mono font-bold text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#0b252c] mb-1">Service Description</label>
                <textarea
                  rows={2}
                  value={serviceDesc}
                  onChange={(e) => setServiceDesc(e.target.value)}
                  placeholder="Describe MOQ, specifications, paper quality, lead time, etc."
                  className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-lg px-3 py-2 text-[#0b252c] text-xs"
                />
              </div>

              {/* Website Toggle */}
              <div className="bg-[#f0f8fa] p-3 rounded-lg border border-[#cce7ed] flex items-center justify-between">
                <div>
                  <span className="block font-semibold text-[#0b252c]">Publish on Website</span>
                  <span className="text-[11px] text-[#4a6870]">Allows customer enquiry from website.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setServiceShowOnWebsite(!serviceShowOnWebsite)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    serviceShowOnWebsite ? "bg-[#056468] text-white" : "bg-white text-[#4a6870] border border-[#cce7ed]"
                  }`}
                >
                  {serviceShowOnWebsite ? "Visible" : "Hidden"}
                </button>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#cce7ed]">
                <button
                  type="button"
                  onClick={() => setServiceModalOpen(false)}
                  className="px-4 py-2 font-medium text-[#4a6870] hover:text-[#0b252c]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={serviceLoading || serviceUploading}
                  className="px-4 py-2 bg-[#056468] hover:bg-[#044e51] text-white font-medium rounded-lg shadow-sm"
                >
                  {serviceLoading ? "Saving..." : "Save & Publish Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK REFILL STOCK & GENERATE/PRINT BARCODES MODAL */}
      {refillProduct && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto pointer-events-auto">
          <div className="relative z-[10000] bg-white border border-[#cce7ed] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-[#0b252c]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#cce7ed] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#e3f2f5] flex items-center justify-center text-[#056468]">
                  <Zap className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#0b252c]">
                    {refillStep === "input" ? "Refill Stock & Generate Barcodes" : "Barcodes Generated Successfully"}
                  </h3>
                  <p className="text-xs text-[#4a6870] font-normal">
                    {refillProduct.name} (SKU: {refillProduct.variants?.[0]?.sku})
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (refillStep === "success") {
                    window.location.reload();
                  } else {
                    setRefillProduct(null);
                  }
                }}
                className="text-[#5f818b] hover:text-[#0b252c] text-base"
              >
                ✕
              </button>
            </div>

            {/* STEP 1: QUANTITY INPUT */}
            {refillStep === "input" && (
              <form onSubmit={handleRefillStockSubmit} className="space-y-4 text-xs">
                {/* Product Summary Box */}
                <div className="bg-[#f0f8fa] border border-[#cce7ed] rounded-lg p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-[#4a6870] block">Current Available Stock</span>
                    <span className="text-lg font-bold text-[#056468]">
                      {refillProduct.variants?.[0]?.inventory?.quantity ?? 0} Units
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-[#4a6870] block">Selling Price / Unit</span>
                    <span className="text-sm font-bold text-[#0b252c]">
                      ₹{(refillProduct.offerPrice || refillProduct.variants?.[0]?.sellingPrice || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Quantity Input */}
                <div>
                  <label className="block font-medium text-[#0b252c] mb-1.5">
                    How many units would you like to add? *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    required
                    value={refillQty}
                    onChange={(e) => setRefillQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-lg px-4 py-2.5 text-lg text-[#056468] font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[#056468]"
                  />
                </div>

                {/* Quick Increment Preset Buttons */}
                <div>
                  <span className="text-[11px] text-[#4a6870] block mb-1.5 font-medium">Quick Presets:</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {[5, 10, 20, 50, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setRefillQty(preset)}
                        className={`px-3 py-1.5 rounded-lg font-mono font-medium text-xs transition-all ${
                          refillQty === preset
                            ? "bg-[#056468] text-white shadow-xs"
                            : "bg-[#f0f8fa] text-[#056468] border border-[#cce7ed] hover:bg-[#e3f2f5]"
                        }`}
                      >
                        +{preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stock Prediction Notice */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-800 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Inventory Update Preview:</span>
                  </div>
                  <p className="mt-1 text-[11px] text-emerald-700">
                    Adding <strong>+{refillQty} units</strong> will increase stock from{" "}
                    <strong>{refillProduct.variants?.[0]?.inventory?.quantity ?? 0}</strong> to{" "}
                    <strong>{(refillProduct.variants?.[0]?.inventory?.quantity ?? 0) + refillQty}</strong> total units,
                    and generate <strong>{refillQty}</strong> unique sequential Code 128 barcodes.
                  </p>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#cce7ed]">
                  <button
                    type="button"
                    onClick={() => setRefillProduct(null)}
                    className="px-4 py-2 font-medium text-[#4a6870] hover:text-[#0b252c]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={refillLoading}
                    className="px-5 py-2.5 bg-[#056468] hover:bg-[#044e51] text-white font-medium rounded-lg shadow-sm flex items-center gap-1.5"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    <span>{refillLoading ? "Generating Barcodes..." : `Generate Barcodes & Add +${refillQty}`}</span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: SUCCESS & IMMEDIATE THERMAL PRINTING */}
            {refillStep === "success" && (
              <div className="space-y-4 text-xs">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="text-sm font-bold text-emerald-900">
                    Added +{generatedBarcodes.length} Units to Stock!
                  </h4>
                  <p className="text-xs text-emerald-700">
                    Sequential Code 128 barcodes have been created and assigned to {refillProduct.name}.
                  </p>
                </div>

                {/* Primary Call to Action: Batch Thermal Printing */}
                <div className="bg-[#f0f8fa] border border-[#cce7ed] rounded-xl p-4 space-y-3 text-center">
                  <div>
                    <span className="text-xs font-semibold text-[#0b252c] block">
                      Print Thermal Labels for All {generatedBarcodes.length} Units
                    </span>
                    <span className="text-[11px] text-[#4a6870]">
                      Ready formatted for 50x30mm thermal rolls (Zebra, TVS, TSC, Rollo).
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleBatchPrint}
                    className="w-full py-3 bg-[#056468] hover:bg-[#044e51] text-white font-bold text-sm rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    <span>🖨️ Batch Print All {generatedBarcodes.length} Thermal Labels</span>
                  </button>
                </div>

                {/* Barcode Range Preview */}
                <div className="bg-white border border-[#cce7ed] rounded-lg p-3 space-y-2">
                  <span className="text-[11px] font-semibold text-[#0b252c] block">
                    Generated Barcode Series Preview:
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 divide-y divide-[#cce7ed]/60">
                    {generatedBarcodes.map((bc, idx) => (
                      <div key={bc} className="pt-1.5 flex items-center justify-between font-mono text-[11px]">
                        <span className="text-[#056468] font-bold">
                          Unit #{idx + 1}: <span className="text-[#0b252c]">{bc}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setPrintBarcodesList([bc]);
                            setPrintModalOpen(true);
                          }}
                          className="px-2 py-0.5 bg-white hover:bg-[#f0f8fa] border border-[#cce7ed] rounded text-[10px] text-[#056468] font-sans font-medium flex items-center gap-1"
                        >
                          <Printer className="w-2.5 h-2.5" />
                          <span>Print</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Done Button */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#cce7ed]">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-5 py-2 bg-[#056468] hover:bg-[#044e51] text-white font-medium rounded-lg text-xs"
                  >
                    Done & Refresh Catalog
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BULK MULTI-PRODUCT REFILL & MASTER PRINT MODAL */}
      {bulkRefillOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto pointer-events-auto">
          <div className="relative z-[10000] bg-white border border-[#cce7ed] rounded-xl max-w-2xl w-full p-6 shadow-2xl space-y-4 text-[#0b252c] max-h-[90vh] flex flex-col justify-between">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#cce7ed] pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Zap className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#0b252c]">
                    {bulkStep === "input" ? "Bulk Refill Multiple Products & Generate Barcodes" : "Bulk Generation Complete"}
                  </h3>
                  <p className="text-xs text-[#4a6870] font-normal">
                    {bulkStep === "input"
                      ? "Add stock quantities to multiple products and batch print serial thermal labels in one go."
                      : `Successfully generated barcodes for ${bulkResults.length} products.`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (bulkStep === "success") {
                    window.location.reload();
                  } else {
                    setBulkRefillOpen(false);
                  }
                }}
                className="text-[#5f818b] hover:text-[#0b252c] text-base"
              >
                ✕
              </button>
            </div>

            {/* STEP 1: BULK SELECTION TABLE */}
            {bulkStep === "input" && (
              <form onSubmit={handleBulkSubmit} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
                {/* Global Action Tools */}
                <div className="bg-[#f0f8fa] border border-[#cce7ed] p-3 rounded-lg flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleSelectAllBulk(true)}
                      className="px-2.5 py-1 bg-white border border-[#cce7ed] rounded text-[11px] font-medium text-[#056468] hover:bg-[#e3f2f5]"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSelectAllBulk(false)}
                      className="px-2.5 py-1 bg-white border border-[#cce7ed] rounded text-[11px] font-medium text-[#5f818b] hover:bg-[#f0f8fa]"
                    >
                      Deselect All
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-[#4a6870] font-medium">Set All Qty:</span>
                    {[5, 10, 20, 50].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setAllBulkQty(num)}
                        className="px-2 py-0.5 bg-white border border-[#cce7ed] rounded text-[11px] font-mono font-bold text-[#056468] hover:bg-[#e3f2f5]"
                      >
                        +{num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bulk Items Table */}
                <div className="border border-[#cce7ed] rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f8fcfe] text-[#0b252c] font-semibold border-b border-[#cce7ed]">
                      <tr>
                        <th className="p-2.5 w-8 text-center">✓</th>
                        <th className="p-2.5">Product & SKU</th>
                        <th className="p-2.5 text-right">In Stock</th>
                        <th className="p-2.5 text-right">Price</th>
                        <th className="p-2.5 text-right w-28">Refill Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#cce7ed]">
                      {bulkItems.map((item, idx) => (
                        <tr
                          key={item.id}
                          className={`hover:bg-[#f8fcfe] transition-colors ${
                            item.selected ? "bg-white" : "bg-slate-50 opacity-60"
                          }`}
                        >
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setBulkItems((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, selected: checked } : it))
                                );
                              }}
                              className="rounded border-[#cce7ed] text-[#056468] focus:ring-[#056468]"
                            />
                          </td>
                          <td className="p-2.5">
                            <div className="font-semibold text-[#0b252c]">{item.name}</div>
                            <div className="text-[11px] text-[#5f818b] font-mono">SKU: {item.sku}</div>
                          </td>
                          <td className="p-2.5 text-right font-medium text-[#056468]">{item.currentStock}</td>
                          <td className="p-2.5 text-right font-medium text-[#0b252c]">₹{item.price.toFixed(2)}</td>
                          <td className="p-2.5 text-right">
                            <input
                              type="number"
                              min="0"
                              max="500"
                              disabled={!item.selected}
                              value={item.qty}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setBulkItems((prev) =>
                                  prev.map((it, i) => (i === idx ? { ...it, qty: val } : it))
                                );
                              }}
                              className="w-20 bg-[#f8fcfe] border border-[#cce7ed] rounded px-2 py-1 text-xs font-bold font-mono text-[#056468] text-right focus:outline-none focus:ring-1 focus:ring-[#056468]"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary Box */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-emerald-900 block">
                      {bulkItems.filter((it) => it.selected && it.qty > 0).length} Products Selected
                    </span>
                    <span className="text-[11px] text-emerald-700">
                      Total New Barcodes to Generate:{" "}
                      <strong>
                        {bulkItems
                          .filter((it) => it.selected && it.qty > 0)
                          .reduce((sum, it) => sum + it.qty, 0)}{" "}
                        Units
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#cce7ed]">
                  <button
                    type="button"
                    onClick={() => setBulkRefillOpen(false)}
                    className="px-4 py-2 font-medium text-[#4a6870] hover:text-[#0b252c]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bulkProcessing}
                    className="px-5 py-2.5 bg-[#056468] hover:bg-[#044e51] text-white font-medium rounded-lg shadow-sm flex items-center gap-1.5"
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    <span>
                      {bulkProcessing
                        ? `Generating (${bulkProgress.current}/${bulkProgress.total})...`
                        : "Generate All Barcodes & Refill Stock"}
                    </span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: BULK SUCCESS & MASTER BATCH PRINT */}
            {bulkStep === "success" && (
              <div className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="text-base font-bold text-emerald-900">
                    Bulk Generation Complete ({bulkResults.reduce((s, r) => s + r.count, 0)} Total Labels)
                  </h4>
                  <p className="text-xs text-emerald-700">
                    Generated sequential Code 128 barcodes across {bulkResults.length} different products.
                  </p>
                </div>

                {/* Master Batch Print Button */}
                <div className="bg-[#f0f8fa] border-2 border-[#056468] rounded-xl p-4 text-center space-y-2">
                  <span className="text-xs font-bold text-[#056468] block">
                    Master Serial Print Run (All Products & Units in Sequence)
                  </span>
                  <p className="text-[11px] text-[#4a6870]">
                    Outputs all {bulkResults.reduce((s, r) => s + r.count, 0)} stickers sequentially product-wise formatted for 50x30mm thermal label rolls or PDF preview.
                  </p>
                  <button
                    type="button"
                    onClick={handleMasterBatchPrint}
                    className="w-full py-3 bg-[#056468] hover:bg-[#044e51] text-white font-bold text-sm rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    <span>🖨️ Master Batch Print All ({bulkResults.reduce((s, r) => s + r.count, 0)} Labels)</span>
                  </button>
                </div>

                {/* Product Breakdown List */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-[#0b252c] block">
                    Product-Wise Barcode Breakdown & Individual Printing:
                  </span>
                  <div className="divide-y divide-[#cce7ed] border border-[#cce7ed] rounded-lg overflow-hidden">
                    {bulkResults.map((res) => (
                      <div key={res.productId} className="p-3 bg-white flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-[#0b252c]">{res.name}</div>
                          <div className="text-[11px] text-[#5f818b] font-mono">
                            SKU: {res.sku} | Range: {res.barcodes[0]}..{res.barcodes[res.barcodes.length - 1]}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-[#056468]">{res.count} Labels</span>
                          <button
                            type="button"
                            onClick={() => {
                              const items = res.barcodes.map((b, idx) => ({
                                productName: res.name,
                                sku: res.sku,
                                price: res.price,
                                barcode: b,
                                serialNumber: idx + 1,
                              }));
                              setPrintItemsList(items);
                              setPrintBarcodesList([]);
                              setPrintModalOpen(true);
                            }}
                            className="px-3 py-1 bg-white hover:bg-[#f0f8fa] border border-[#cce7ed] rounded-lg text-xs text-[#056468] font-medium flex items-center gap-1 shadow-xs"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Print ({res.count})</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Done Button */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#cce7ed]">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-5 py-2 bg-[#056468] hover:bg-[#044e51] text-white font-medium rounded-lg text-xs"
                  >
                    Done & Refresh Catalog
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* UNIVERSAL THERMAL LABEL PRINT DIALOG */}
      {printModalOpen && (
        <PrintLabelDialog
          isOpen={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          productName={refillProduct?.name || "Product"}
          sku={refillProduct?.variants?.[0]?.sku || "SKU"}
          price={refillProduct?.offerPrice || refillProduct?.variants?.[0]?.sellingPrice || 0}
          barcodes={printBarcodesList}
          items={printItemsList}
        />
      )}

      {/* Safety Delete Product Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleConfirmDeleteProduct}
        title="Delete Product & All Associated Barcodes"
        itemName={productToDelete ? `${productToDelete.name} (SKU: ${productToDelete.variants?.[0]?.sku || "N/A"})` : ""}
      />
    </div>
  );
}


