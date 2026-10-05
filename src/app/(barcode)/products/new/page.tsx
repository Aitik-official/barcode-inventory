"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  ArrowLeft,
  Upload,
  Globe,
  ScanBarcode,
  Package,
  Wrench,
  CheckCircle2,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  mainUse: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    subCategoryId: "",
    level2CategoryId: "",
    brand: "",
    vendor: "",
    hsn: "",
    mrp: "999",
    offerPrice: "799",
    gstPercent: "18",
    description: "",
    imageUrl: "",
    sku: "",
    color: "Black",
    size: "M",
    unit: "PCS",
    purchasePrice: "400",
    sellingPrice: "799",
    initialQuantity: "10",
    showOnWebsite: true,
    featured: false,
    badge: "None",
    homepageSections: ["FEATURED"] as string[],
    displayOrder: 99,
    productType: "PRODUCT",
  });

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((cats) => {
        if (Array.isArray(cats)) setCategories(cats);
      })
      .catch(() => {});

    try {
      const savedBrand = localStorage.getItem("barcodezaa_default_brand");
      if (savedBrand) {
        setFormData((prev) => ({ ...prev, brand: prev.brand || savedBrand }));
      }
    } catch {}
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError(null);

    try {
      const uploadData = new FormData();
      uploadData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Image upload failed");
      }

      setFormData((prev) => ({ ...prev, imageUrl: data.url }));
    } catch (err: any) {
      setError("Cloudinary Upload Error: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create product");
      }

      router.push(`/products/${data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3-Tier Filtered Dropdown Lists
  const mainCategories = categories.filter((c) => !c.parentId);
  const subCategories = categories.filter((c) => c.parentId && formData.categoryId && c.parentId === formData.categoryId);
  const level2SubCategories = categories.filter((c) => c.parentId && formData.subCategoryId && c.parentId === formData.subCategoryId);

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-2">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-[#cce7ed] pb-4">
        <div>
          <h1 className="text-xl font-bold text-[#0b252c] flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#056468]" />
            <span>Add New Product or Service</span>
          </h1>
          <p className="text-xs text-[#4a6870] font-normal mt-0.5">
            Creates variant SKU, uploads image to Cloudinary (<code className="text-[#056468] font-mono font-medium">barcode-inventory</code>), and generates per-unit barcodes.
          </p>
        </div>
        <Link
          href="/products"
          className="text-xs font-medium text-[#056468] hover:bg-[#f0f8fa] bg-white border border-[#cce7ed] px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-[#cce7ed] rounded-xl p-6 shadow-sm space-y-6 text-[#0b252c]">
        {/* Section 1: Master Info */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-[#056468] uppercase tracking-wider border-b border-[#cce7ed] pb-2 flex items-center gap-1.5">
            <Package className="w-4 h-4" />
            <span>1. Product Details & Cloudinary Image</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block font-medium text-[#0b252c] mb-1">
                Product Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Premium Thermal Label Rolls (50x30mm)"
                className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-lg px-3 py-2 text-xs text-[#0b252c] focus:outline-none focus:ring-2 focus:ring-[#056468]"
              />
            </div>

            {/* Product Type & Website Toggle */}
            <div className="sm:col-span-2 bg-[#f0f8fa] border border-[#cce7ed] p-3.5 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#056468] flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-[#056468]" />
                  <span>Website Publishing Status</span>
                </label>
                <p className="text-[11px] text-[#4a6870] font-normal">Controls if item is fetched by your main website storefront.</p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  name="productType"
                  value={formData.productType}
                  onChange={handleChange}
                  className="bg-white border border-[#cce7ed] rounded-lg px-3 py-1.5 text-xs text-[#0b252c] font-medium"
                >
                  <option value="PRODUCT">Standard Product</option>
                  <option value="SERVICE">Custom Service</option>
                </select>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, showOnWebsite: !formData.showOnWebsite })}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                    formData.showOnWebsite
                      ? "bg-[#056468] text-white border-[#044e51] shadow-xs"
                      : "bg-white text-[#4a6870] border-[#cce7ed]"
                  }`}
                >
                  <span>{formData.showOnWebsite ? "Visible on Website" : "Hidden from Website"}</span>
                </button>
              </div>
            </div>

            {/* Homepage Section Placement Controls (Only visible when product is published to website) */}
            {formData.showOnWebsite && (
              <div className="sm:col-span-2 bg-[#f0f8fa] border border-[#cce7ed] p-3.5 rounded-lg space-y-3 animate-in fade-in duration-150">
                <div>
                  <label className="block text-xs font-semibold text-[#056468] flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-[#056468]" />
                    <span>Homepage Placement & Section Checkboxes</span>
                  </label>
                  <p className="text-[11px] text-[#4a6870] font-normal">Check boxes to specify which sections of the homepage index this product appears in.</p>
                </div>

                <div className="flex flex-wrap gap-3 pt-1">
                  {[
                    { key: "HERO", label: "Hero Spotlight Banner" },
                    { key: "FEATURED", label: "Featured Carousel" },
                    { key: "BEST_SELLER", label: "Best Sellers Section" },
                    { key: "NEW_ARRIVALS", label: "New Arrivals" },
                    { key: "DEALS", label: "Special Deals" },
                  ].map((sec) => {
                    const checked = formData.homepageSections.includes(sec.key);
                    return (
                      <label key={sec.key} className="flex items-center gap-1.5 text-xs text-[#0b252c] font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const newSecs = e.target.checked
                              ? [...formData.homepageSections, sec.key]
                              : formData.homepageSections.filter((s) => s !== sec.key);
                            setFormData({ ...formData, homepageSections: newSecs });
                          }}
                          className="rounded text-[#056468] focus:ring-0"
                        />
                        <span>{sec.label}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#cce7ed]">
                  <div>
                    <label className="block font-medium text-[#0b252c] mb-1">Card Badge</label>
                    <select
                      name="badge"
                      value={formData.badge}
                      onChange={handleChange}
                      className="w-full bg-white border border-[#cce7ed] rounded-lg px-2.5 py-1.5 text-xs text-[#0b252c]"
                    >
                      <option value="None">None</option>
                      <option value="Best Seller">Best Seller</option>
                      <option value="New">New</option>
                      <option value="HD 1080p">HD 1080p</option>
                      <option value="Hot Deal">Hot Deal</option>
                      <option value="Trending">Trending</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-[#0b252c] mb-1">Display Priority (Order #)</label>
                    <input
                      type="number"
                      name="displayOrder"
                      value={formData.displayOrder}
                      onChange={handleChange}
                      className="w-full bg-white border border-[#cce7ed] rounded-lg px-2.5 py-1.5 text-xs text-[#0b252c] font-mono font-semibold"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Cloudinary Image Uploader */}
            <div className="sm:col-span-2 bg-[#f0f8fa] p-3.5 rounded-lg border border-[#cce7ed] space-y-2">
              <label className="block text-xs font-semibold text-[#056468] flex items-center gap-1">
                <Upload className="w-3.5 h-3.5 text-[#056468]" />
                <span>Product Image (Cloudinary Folder: barcode-inventory)</span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="text-xs text-[#4a6870] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#056468] file:text-white"
                />
                {uploadingImage && <span className="text-xs font-medium text-[#056468] animate-pulse">Uploading to Cloudinary...</span>}
              </div>

              {formData.imageUrl && (
                <div className="flex items-center gap-3 pt-1">
                  <img src={formData.imageUrl} alt="Uploaded preview" className="w-14 h-14 object-cover rounded-lg border border-[#056468]" />
                  <span className="text-[11px] font-mono text-emerald-700 truncate max-w-md flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Uploaded: {formData.imageUrl}</span>
                  </span>
                </div>
              )}
            </div>

            {/* 3-Tier Dropdowns */}
            <div>
              <label className="block font-medium text-[#0b252c] mb-1">Main Category (Level 1)</label>
              <select
                name="categoryId"
                value={formData.categoryId}
                onChange={(e) => {
                  setFormData({ ...formData, categoryId: e.target.value, subCategoryId: "", level2CategoryId: "" });
                }}
                className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-lg px-3 py-2 text-xs text-[#0b252c] focus:outline-none focus:ring-2 focus:ring-[#056468]"
              >
                <option value="">Select Main Category</option>
                {mainCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    Main: {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-[#0b252c] mb-1">Sub-Category (Level 2)</label>
              <select
                name="subCategoryId"
                value={formData.subCategoryId}
                onChange={(e) => {
                  setFormData({ ...formData, subCategoryId: e.target.value, level2CategoryId: "" });
                }}
                disabled={!formData.categoryId}
                className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-lg px-3 py-2 text-xs text-[#0b252c] focus:outline-none focus:ring-2 focus:ring-[#056468] disabled:opacity-50"
              >
                <option value="">Select Sub-Category</option>
                {subCategories.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    Sub: {sc.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-medium text-[#0b252c] mb-1">Level 2 Sub-Category (Level 3)</label>
              <select
                name="level2CategoryId"
                value={formData.level2CategoryId}
                onChange={handleChange}
                disabled={!formData.subCategoryId}
                className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-lg px-3 py-2 text-xs text-[#0b252c] focus:outline-none focus:ring-2 focus:ring-[#056468] disabled:opacity-50"
              >
                <option value="">Select Level 2 Sub-Category</option>
                {level2SubCategories.map((l2) => (
                  <option key={l2.id} value={l2.id}>
                    Level 2 Sub: {l2.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-[#0b252c] mb-1">Brand Name</label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="e.g. BarcodeZaa Pro"
                className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-lg px-3 py-2 text-xs text-[#0b252c]"
              />
            </div>

            <div>
              <label className="block font-medium text-[#0b252c] mb-1">Vendor / Supplier</label>
              <input
                type="text"
                name="vendor"
                value={formData.vendor}
                onChange={handleChange}
                placeholder="e.g. Direct Manufacturer"
                className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-lg px-3 py-2 text-xs text-[#0b252c]"
              />
            </div>

            <div>
              <label className="block font-medium text-[#0b252c] mb-1">HSN / SAC Code</label>
              <input
                type="text"
                name="hsn"
                value={formData.hsn}
                onChange={handleChange}
                placeholder="e.g. 4821"
                className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-lg px-3 py-2 text-xs text-[#0b252c]"
              />
            </div>

            <div>
              <label className="block font-medium text-[#0b252c] mb-1">GST Tax Rate (%)</label>
              <input
                type="number"
                name="gstPercent"
                value={formData.gstPercent}
                onChange={handleChange}
                placeholder="18"
                className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-lg px-3 py-2 text-xs text-[#0b252c] font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Pricing & SKU */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-[#056468] uppercase tracking-wider border-b border-[#cce7ed] pb-2">
            2. SKU Variant & Pricing
          </h3>

          {/* Custom SKU Field */}
          <div className="bg-[#f0f8fa] border border-[#cce7ed] rounded-lg p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-[#056468]">
                Custom Product SKU (Optional)
              </label>
              <span className="text-[10px] text-[#4a6870] font-normal">
                Leave blank to auto-generate from name & size
              </span>
            </div>
            <input
              type="text"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              placeholder="e.g. AMZ-5050-1000 or FLIP-ROLL-01 (or leave blank for auto-SKU)"
              className="w-full bg-white border border-[#cce7ed] rounded-lg px-3 py-2 text-xs font-mono font-bold text-[#0b252c] focus:outline-none focus:ring-2 focus:ring-[#056468] uppercase placeholder:font-normal placeholder:capitalize"
            />
            <p className="text-[11px] text-[#4a6870]">
              💡 Matches your marketplace Amazon ASIN / Flipkart FSN SKU mappings for seamless order synchronization.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-medium text-[#0b252c] mb-1">Color Variant</label>
              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleChange}
                placeholder="e.g. White"
                className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-lg px-3 py-2 text-xs text-[#0b252c]"
              />
            </div>

            <div>
              <label className="block font-medium text-[#0b252c] mb-1">Size Variant</label>
              <input
                type="text"
                name="size"
                value={formData.size}
                onChange={handleChange}
                placeholder="e.g. 50x30mm"
                className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-lg px-3 py-2 text-xs text-[#0b252c]"
              />
            </div>

            <div>
              <label className="block font-medium text-[#0b252c] mb-1">MRP Price (₹)</label>
              <input
                type="number"
                name="mrp"
                value={formData.mrp}
                onChange={handleChange}
                placeholder="999"
                className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-lg px-3 py-2 text-xs text-[#0b252c] font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-[#0b252c] mb-1">Offer Price (₹)</label>
              <input
                type="number"
                name="offerPrice"
                value={formData.offerPrice}
                onChange={handleChange}
                placeholder="799"
                className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-lg px-3 py-2 text-xs text-[#056468] font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-medium text-[#0b252c] mb-1">Purchase Cost (₹)</label>
              <input
                type="number"
                name="purchasePrice"
                value={formData.purchasePrice}
                onChange={handleChange}
                placeholder="400"
                className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-lg px-3 py-2 text-xs text-[#0b252c] font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-[#0b252c] mb-1">Unit Type</label>
              <input
                type="text"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                placeholder="PCS / REAM / ROLL"
                className="w-full bg-[#f8fcfe] border border-[#cce7ed] rounded-lg px-3 py-2 text-xs text-[#0b252c]"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Stock Quantity */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-[#056468] uppercase tracking-wider border-b border-[#cce7ed] pb-2 flex items-center gap-1.5">
            <ScanBarcode className="w-4 h-4" />
            <span>3. Per-Unit Serial Barcode Generation</span>
          </h3>

          <div className="bg-[#f0f8fa] border border-[#cce7ed] rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-semibold text-[#056468]">
                  Initial Stock Quantity (Number of Units)
                </label>
                <p className="text-[11px] text-[#4a6870] font-normal">
                  System will generate this exact number of unique 12-digit Code 128 barcodes.
                </p>
              </div>
              <input
                type="number"
                name="initialQuantity"
                min="1"
                max="500"
                value={formData.initialQuantity}
                onChange={handleChange}
                className="w-24 bg-white border border-[#056468] rounded-lg px-3 py-1.5 text-base text-[#056468] font-bold font-mono text-center focus:ring-2 focus:ring-[#056468]"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#cce7ed]">
          <Link
            href="/products"
            className="px-4 py-2 rounded-lg text-[#4a6870] hover:text-[#0b252c] text-xs font-medium"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || uploadingImage}
            className="px-5 py-2.5 rounded-lg bg-[#056468] hover:bg-[#044e51] text-white font-medium text-xs shadow transition-all disabled:opacity-50"
          >
            {loading ? "Generating Barcodes..." : "Save Product & Barcodes"}
          </button>
        </div>
      </form>
    </div>
  );
}
