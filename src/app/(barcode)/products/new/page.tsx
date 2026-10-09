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
  FileText,
  Sparkles,
  ListChecks,
  Tag,
  Eye,
  ShoppingBag,
  Star,
  ShieldCheck,
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
    tags: "",
    imageUrl: "",
    sku: "",
    color: "Black",
    size: "Standard",
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

  const loadTemplate = (type: "CAMERA" | "GPS" | "DETECTOR" | "CLEAR") => {
    if (type === "CAMERA") {
      setFormData((prev) => ({
        ...prev,
        description: `• 1080P Full HD Video with 150° Ultra Wide-Angle Lens\n• Invisible Infrared Night Vision (Up to 5 meters in pitch black)\n• AI Motion Detection Sensor with Realtime Instant Mobile Alerts\n• Built-in Rechargeable 500mAh Lithium Battery (3-4 hrs active / 24/7 plugged-in)\n• Supports MicroSD Card Loop Recording (up to 128GB)\n• Includes 360° Magnetic Rotating Base, USB Cable & Mounting Pad`,
        tags: prev.tags || "mini camera, spy cam, wifi security, night vision, hidden camera",
        badge: prev.badge === "None" ? "Best Seller" : prev.badge,
      }));
    } else if (type === "GPS") {
      setFormData((prev) => ({
        ...prev,
        description: `• Realtime Live GPS + LBS + WiFi Multi-Mode Satellite Positioning\n• Strong Built-in Industrial Neodymium Magnet for Instant Vehicle Mounting\n• Geo-Fence Boundary Breach & Speeding Alerts on Smartphone App\n• Long-lasting 5000mAh Battery with 30-Day Ultra Low Power Standby\n• Live Audio Monitoring & Historic Route Playback (up to 90 days)`,
        tags: prev.tags || "gps tracker, magnetic vehicle tracker, car tracker, anti-theft, live audio",
        badge: prev.badge === "None" ? "Trending" : prev.badge,
      }));
    } else if (type === "DETECTOR") {
      setFormData((prev) => ({
        ...prev,
        description: `• Multi-Frequency RF Signal & Infrared Laser Lens Optical Scanner\n• Accurately Pinpoints Wireless Hidden Cameras, GPS Trackers & Audio Bugs\n• Ultra-Wide Frequency Detection Band (1MHz to 6.5GHz)\n• Dual Alert Modes: Sound Beep & Silent Vibration for Discreet Sweeps\n• Compact Pocket-Sized Aviation Aluminum Housing with Rechargeable Battery`,
        tags: prev.tags || "bug detector, hidden camera finder, rf scanner, privacy protection, anti-spy",
        badge: prev.badge === "None" ? "HD 1080p" : prev.badge,
      }));
    } else {
      setFormData((prev) => ({ ...prev, description: "", tags: "" }));
    }
  };

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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {[
                    { key: "FEATURED", label: "Featured Products (Tab 1)", desc: "Primary 3×3 / 4×4 grid" },
                    { key: "NEW_ARRIVALS", label: "New Arrivals (Tab 2)", desc: "New release products" },
                    { key: "DEALS", label: "Limited Deals (Tab 3)", desc: "Discount ≥20% / Hot Deals" },
                    { key: "BEST_SELLER", label: "Best Sellers (Carousel)", desc: "Auto-scrolling carousel" },
                  ].map((sec) => {
                    const checked = formData.homepageSections.includes(sec.key);
                    return (
                      <label key={sec.key} className="flex items-start gap-2 text-xs text-[#0b252c] font-medium cursor-pointer p-2 rounded-lg bg-white border border-[#cce7ed] hover:border-[#056468] transition-colors">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const newSecs = e.target.checked
                              ? [...formData.homepageSections, sec.key]
                              : formData.homepageSections.filter((s) => s !== sec.key);
                            setFormData({ ...formData, homepageSections: newSecs });
                          }}
                          className="mt-0.5 rounded text-[#056468] focus:ring-0 cursor-pointer"
                        />
                        <div>
                          <div className="font-bold text-[#0b252c]">{sec.label}</div>
                          <div className="text-[10px] text-slate-500">{sec.desc}</div>
                        </div>
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

        {/* Section 2: Website Catalog Description & Technical Specifications */}
        {formData.showOnWebsite && (
          <div className="space-y-4 bg-gradient-to-br from-[#f2fafb] via-white to-[#f0f8fa] p-5 rounded-2xl border-2 border-[#056468]/30 shadow-xs animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#cce7ed] pb-3">
              <div>
                <h3 className="text-xs font-bold text-[#056468] uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#056468]" />
                  <span>2. Website Storefront Description & Technical Specifications</span>
                </h3>
                <p className="text-[11px] text-[#4a6870] mt-0.5">
                  Shown on your online storefront product page, specs tab, search indexing, and Google SEO.
                </p>
              </div>

              {/* Quick Template Fillers */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Quick Spec Presets:</span>
                </span>
                <button
                  type="button"
                  onClick={() => loadTemplate("CAMERA")}
                  className="px-2.5 py-1 rounded-md bg-white hover:bg-emerald-50 text-[#056468] border border-[#cce7ed] hover:border-[#056468] text-[10px] font-bold shadow-2xs transition-all cursor-pointer"
                >
                  📷 Mini Camera
                </button>
                <button
                  type="button"
                  onClick={() => loadTemplate("GPS")}
                  className="px-2.5 py-1 rounded-md bg-white hover:bg-emerald-50 text-[#056468] border border-[#cce7ed] hover:border-[#056468] text-[10px] font-bold shadow-2xs transition-all cursor-pointer"
                >
                  🛰️ GPS Tracker
                </button>
                <button
                  type="button"
                  onClick={() => loadTemplate("DETECTOR")}
                  className="px-2.5 py-1 rounded-md bg-white hover:bg-emerald-50 text-[#056468] border border-[#cce7ed] hover:border-[#056468] text-[10px] font-bold shadow-2xs transition-all cursor-pointer"
                >
                  🛡️ RF Detector
                </button>
                <button
                  type="button"
                  onClick={() => loadTemplate("CLEAR")}
                  className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-medium transition-all cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Description & Specs Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-[#0b252c] flex items-center gap-1">
                  <ListChecks className="w-3.5 h-3.5 text-[#056468]" />
                  <span>Full Overview & Feature Bullet Points</span>
                </label>
                <span className="text-[10px] text-slate-500 font-mono">
                  {formData.description.length} characters • {formData.description.split("\n").filter(Boolean).length} bullet points
                </span>
              </div>
              <textarea
                name="description"
                rows={6}
                value={formData.description}
                onChange={handleChange}
                placeholder={`• 1080P Full HD Video with 150° Ultra Wide-Angle Lens\n• Invisible Infrared Night Vision (Up to 5m in pitch black)\n• AI Motion Detection Sensor with Realtime Instant Mobile Alerts\n• Built-in Rechargeable 500mAh Lithium Battery\n• Supports MicroSD Card Loop Recording (up to 128GB)`}
                className="w-full bg-white border border-[#cce7ed] focus:border-[#056468] rounded-xl p-3 text-xs text-[#0b252c] leading-relaxed font-sans focus:outline-none focus:ring-2 focus:ring-[#056468]/20 shadow-inner placeholder:text-slate-400"
              />
              <p className="text-[10px] text-slate-500">
                💡 Tip: Each line starting with a bullet (<code className="font-mono text-[#056468]">•</code>) or dash (<code className="font-mono text-[#056468]">-</code>) is automatically rendered as a stylized feature point on the product page.
              </p>
            </div>

            {/* Search & SEO Tags */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-semibold text-[#0b252c] flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-[#056468]" />
                <span>Search Tags & Storefront Keywords</span>
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="e.g. mini camera, spy cam, wifi security, 1080p, night vision, hidden camera"
                className="w-full bg-white border border-[#cce7ed] focus:border-[#056468] rounded-xl px-3 py-2 text-xs text-[#0b252c] focus:outline-none focus:ring-2 focus:ring-[#056468]/20"
              />
              {formData.tags && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {formData.tags
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-[#e3f2f5] border border-[#cce7ed] text-[#056468] text-[10px] font-semibold"
                      >
                        #{tag}
                      </span>
                    ))}
                </div>
              )}
            </div>

            {/* LIVE WEBSITE STOREFRONT CARD PREVIEW */}
            <div className="pt-3 border-t border-[#cce7ed]/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#056468] uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Live Storefront Card Preview</span>
                </label>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Realtime Preview
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-4">
                {/* Image */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center relative">
                  {formData.imageUrl ? (
                    <img src={formData.imageUrl} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-2 text-slate-400 text-[10px]">
                      <Package className="w-6 h-6 mx-auto mb-1 opacity-50" />
                      <span>No Image</span>
                    </div>
                  )}
                  {formData.badge && formData.badge !== "None" && (
                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded text-[9px] font-black bg-amber-400 text-slate-900 shadow-xs uppercase tracking-wider">
                      {formData.badge}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-1.5 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <span className="text-[10px] font-semibold text-[#056468] uppercase tracking-wider">
                      {categories.find((c) => c.id === formData.categoryId)?.name || "General Catalog"}
                    </span>
                    <div className="flex items-center text-amber-400 text-xs">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                      ))}
                      <span className="text-[10px] text-slate-500 font-bold ml-1">4.9 (48)</span>
                    </div>
                  </div>

                  <h4 className="font-bold text-sm text-slate-900 leading-snug">
                    {formData.name || "Product Name Display"}
                  </h4>

                  {formData.description ? (
                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                      {formData.description.split("\n")[0]?.replace(/^[•\-*]\s*/, "")}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">No description entered yet.</p>
                  )}

                  {/* Pricing & CTA */}
                  <div className="flex items-center justify-center sm:justify-between gap-3 pt-1 flex-wrap">
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-extrabold text-[#056468] font-mono">
                        ₹{Number(formData.offerPrice || 0).toLocaleString("en-IN")}
                      </span>
                      {Number(formData.mrp) > Number(formData.offerPrice) && (
                        <>
                          <span className="text-xs text-slate-400 line-through font-mono">
                            ₹{Number(formData.mrp).toLocaleString("en-IN")}
                          </span>
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            {Math.round(((Number(formData.mrp) - Number(formData.offerPrice)) / Number(formData.mrp)) * 100)}% OFF
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="px-3 py-1 rounded-lg bg-[#056468] text-white font-bold text-[10px] shadow-xs flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3" />
                        <span>Buy Now</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: SKU Variant & Pricing */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-[#056468] uppercase tracking-wider border-b border-[#cce7ed] pb-2">
            3. SKU Variant & Pricing
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
