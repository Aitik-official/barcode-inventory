"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Globe,
  Sparkles,
  Award,
  Zap,
  Tag,
  CheckCircle2,
  Code,
  LayoutGrid,
  Settings,
  Eye,
  EyeOff,
  Save,
  ArrowRight,
  Sliders,
  Flame,
  Star,
} from "lucide-react";

export default function WebsiteClient({
  products: initialProducts,
  categories,
}: {
  products: any[];
  categories: any[];
}) {
  const [products, setProducts] = useState<any[]>(initialProducts);
  const [activeTab, setActiveTab] = useState<"preview" | "controls" | "docs">("preview");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Sections
  const SECTION_KEYS = [
    { key: "HERO", label: "Hero Banner Spotlight", color: "bg-purple-50 text-purple-700 border-purple-200" },
    { key: "FEATURED", label: "Featured Carousel", color: "bg-[#e3f2f5] text-[#056468] border-[#cce7ed]" },
    { key: "BEST_SELLER", label: "Best Sellers Section", color: "bg-amber-50 text-amber-700 border-amber-200" },
    { key: "NEW_ARRIVALS", label: "New Arrivals", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { key: "DEALS", label: "Special Deals", color: "bg-rose-50 text-rose-700 border-rose-200" },
  ];

  const BADGE_OPTIONS = ["None", "Best Seller", "New", "HD 1080p", "Hot Deal", "Trending"];

  const handleToggleWebsiteVisibility = async (product: any) => {
    const updatedVal = !product.showOnWebsite;
    setSavingId(product.id);

    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showOnWebsite: updatedVal }),
      });

      if (!res.ok) throw new Error("Failed to update website visibility");

      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, showOnWebsite: updatedVal } : p))
      );
      setSaveSuccessMsg(`Updated website visibility for "${product.name}"`);
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleUpdateProductPlacement = async (productId: string, patchData: any) => {
    setSavingId(productId);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData),
      });

      if (!res.ok) throw new Error("Failed to update homepage placement");

      const updated = await res.json();
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, ...patchData } : p)));

      setSaveSuccessMsg(`Updated homepage parameters for product.`);
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleSectionCheckboxToggle = (product: any, sectionKey: string) => {
    const currentSections: string[] = product.homepageSections || [];
    const exists = currentSections.includes(sectionKey);

    const newSections = exists
      ? currentSections.filter((s) => s !== sectionKey)
      : [...currentSections, sectionKey];

    const isFeatured = newSections.includes("FEATURED");

    handleUpdateProductPlacement(product.id, {
      homepageSections: newSections,
      featured: isFeatured,
    });
  };

  // Filtered lists for live homepage preview
  const liveProducts = products.filter((p) => p.showOnWebsite);
  const heroProducts = liveProducts
    .filter((p) => p.homepageSections?.includes("HERO"))
    .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));

  const featuredProducts = liveProducts
    .filter((p) => p.featured || p.homepageSections?.includes("FEATURED"))
    .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));

  const bestSellerProducts = liveProducts
    .filter((p) => p.badge === "Best Seller" || p.homepageSections?.includes("BEST_SELLER"))
    .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));

  const newArrivalProducts = liveProducts
    .filter((p) => p.badge === "New" || p.homepageSections?.includes("NEW_ARRIVALS"))
    .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));

  const dealProducts = liveProducts
    .filter((p) => p.badge === "Hot Deal" || p.homepageSections?.includes("DEALS"))
    .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));

  return (
    <div className="space-y-6 py-2">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#cce7ed] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0b252c] flex items-center gap-2.5">
            <Globe className="w-6 h-6 text-[#056468]" />
            <span>Website Storefront & Homepage Placement Manager</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Control which products appear in each section of the main storefront homepage (<code className="bg-[#e3f2f5] px-1.5 py-0.5 rounded text-[#056468] font-mono">HERO</code>, <code className="bg-[#e3f2f5] px-1.5 py-0.5 rounded text-[#056468] font-mono">FEATURED</code>, <code className="bg-[#e3f2f5] px-1.5 py-0.5 rounded text-[#056468] font-mono">BEST_SELLER</code>, <code className="bg-[#e3f2f5] px-1.5 py-0.5 rounded text-[#056468] font-mono">NEW_ARRIVALS</code>).
          </p>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#cce7ed] rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Storefront Live Products</div>
          <div className="text-2xl font-bold text-[#056468] mt-0.5">{liveProducts.length}</div>
          <div className="text-[11px] text-slate-400">Master visibility = ON</div>
        </div>

        <div className="bg-white border border-[#cce7ed] rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Hero Spotlight Banner</div>
          <div className="text-2xl font-bold text-purple-700 mt-0.5">{heroProducts.length}</div>
          <div className="text-[11px] text-purple-600">Assigned HERO tag</div>
        </div>

        <div className="bg-white border border-[#cce7ed] rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Featured Carousel</div>
          <div className="text-2xl font-bold text-emerald-700 mt-0.5">{featuredProducts.length}</div>
          <div className="text-[11px] text-emerald-600">Assigned FEATURED tag</div>
        </div>

        <div className="bg-white border border-[#cce7ed] rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Best Sellers Section</div>
          <div className="text-2xl font-bold text-amber-700 mt-0.5">{bestSellerProducts.length}</div>
          <div className="text-[11px] text-amber-600">Assigned BEST_SELLER tag</div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-[#cce7ed] pb-2">
        <button
          onClick={() => setActiveTab("preview")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === "preview"
              ? "bg-[#056468] text-white shadow-sm"
              : "text-slate-600 hover:text-[#0b252c] hover:bg-white/60"
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          Homepage Live Section Previews
        </button>

        <button
          onClick={() => setActiveTab("controls")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === "controls"
              ? "bg-[#056468] text-white shadow-sm"
              : "text-slate-600 hover:text-[#0b252c] hover:bg-white/60"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Placement & Parameter Controls ({products.length})
        </button>

        <button
          onClick={() => setActiveTab("docs")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === "docs"
              ? "bg-[#056468] text-white shadow-sm"
              : "text-slate-600 hover:text-[#0b252c] hover:bg-white/60"
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          Website Integration Guide & Schemas
        </button>
      </div>

      {/* TAB 1: HOMEPAGE LIVE SECTION PREVIEWS */}
      {activeTab === "preview" && (
        <div className="space-y-8">
          {/* Section 1: Hero Banner Spotlight */}
          <div className="bg-white border border-[#cce7ed] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-[#0b252c] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  Hero Banner Spotlight Section (<code className="text-purple-700 font-mono">HERO</code>)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Top main banner spotlight featured at the peak of the storefront index page.
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 font-medium border border-purple-200">
                {heroProducts.length} Items Assigned
              </span>
            </div>

            {heroProducts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs bg-[#f2f9fa] rounded-xl border border-dashed border-[#cce7ed]">
                No products assigned to HERO banner yet. Go to Placement Controls tab and check "HERO".
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {heroProducts.map((p) => (
                  <div key={p.id} className="bg-[#f2f9fa] border border-[#cce7ed] rounded-xl p-4 flex gap-4 items-center">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-20 h-20 object-cover rounded-lg border border-[#cce7ed]" />
                    ) : (
                      <div className="w-20 h-20 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs">No img</div>
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      {p.badge && (
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                          {p.badge}
                        </span>
                      )}
                      <h3 className="font-semibold text-sm text-[#0b252c] truncate">{p.name}</h3>
                      <p className="text-xs text-slate-500 line-clamp-1">{p.description || "High performance security gadget"}</p>
                      <div className="text-sm font-bold text-emerald-700">₹{p.offerPrice || p.mrp}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Featured Carousel */}
          <div className="bg-white border border-[#cce7ed] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-[#0b252c] flex items-center gap-2">
                  <Star className="w-5 h-5 text-[#056468]" />
                  Featured Carousel Section (<code className="text-[#056468] font-mono">FEATURED</code>)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  "New and notable" product carousel highlighted on the homepage.
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-md bg-[#e3f2f5] text-[#056468] font-medium border border-[#cce7ed]">
                {featuredProducts.length} Items Assigned
              </span>
            </div>

            {featuredProducts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs bg-[#f2f9fa] rounded-xl border border-dashed border-[#cce7ed]">
                No products assigned to FEATURED section yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {featuredProducts.map((p) => (
                  <div key={p.id} className="bg-white border border-[#cce7ed] rounded-xl p-3 space-y-2 shadow-xs hover:border-[#056468]">
                    <div className="relative h-32 w-full bg-[#f2f9fa] rounded-lg overflow-hidden flex items-center justify-center">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs text-slate-400">No Image</span>
                      )}
                      {p.badge && (
                        <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded bg-[#056468] text-white shadow-xs">
                          {p.badge}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-semibold text-xs text-[#0b252c] truncate">{p.name}</h4>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-emerald-700">₹{p.offerPrice || p.mrp}</span>
                        <span className="text-[10px] text-slate-400 line-through">₹{p.mrp}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Best Sellers */}
          <div className="bg-white border border-[#cce7ed] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-[#0b252c] flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-600" />
                  Best Sellers Section (<code className="text-amber-700 font-mono">BEST_SELLER</code>)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  "What customers buy most" highlighted on the homepage.
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 font-medium border border-amber-200">
                {bestSellerProducts.length} Items Assigned
              </span>
            </div>

            {bestSellerProducts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs bg-[#f2f9fa] rounded-xl border border-dashed border-[#cce7ed]">
                No products assigned to BEST_SELLER section yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {bestSellerProducts.map((p) => (
                  <div key={p.id} className="bg-white border border-[#cce7ed] rounded-xl p-3 space-y-2 shadow-xs border-amber-200/80">
                    <div className="relative h-32 w-full bg-[#f2f9fa] rounded-lg overflow-hidden flex items-center justify-center">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs text-slate-400">No Image</span>
                      )}
                      <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-600 text-white shadow-xs">
                        {p.badge || "Best Seller"}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-semibold text-xs text-[#0b252c] truncate">{p.name}</h4>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-emerald-700">₹{p.offerPrice || p.mrp}</span>
                        <span className="text-[10px] text-slate-400 line-through">₹{p.mrp}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PLACEMENT & PARAMETER CONTROLS TABLE */}
      {activeTab === "controls" && (
        <div className="bg-white border border-[#cce7ed] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-[#0b252c] flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#056468]" />
                Storefront Placement & Parameters Control Matrix
              </h2>
              <p className="text-xs text-slate-500">
                Check boxes to place products in homepage sections, assign card badges, and set sort priority.
              </p>
            </div>
            <Link
              href="/products/new"
              className="px-4 py-2 bg-[#056468] hover:bg-[#044e51] text-white font-medium text-xs rounded-xl shadow-sm flex items-center gap-1.5"
            >
              + Add New Product
            </Link>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#cce7ed]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f2f9fa] text-[#0b252c] font-semibold uppercase tracking-wider border-b border-[#cce7ed]">
                <tr>
                  <th className="p-3.5">Product Name</th>
                  <th className="p-3.5 text-center">Live Switch</th>
                  <th className="p-3.5">Homepage Placement Sections</th>
                  <th className="p-3.5">Card Badge</th>
                  <th className="p-3.5">Order #</th>
                  <th className="p-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      No products found in database.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const sections: string[] = p.homepageSections || [];
                    const isSaving = savingId === p.id;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Product Info */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover border border-[#cce7ed]" />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400">
                                Item
                              </div>
                            )}
                            <div>
                              <span className="font-semibold text-[#0b252c] block truncate max-w-xs">{p.name}</span>
                              <span className="text-[11px] text-slate-500 font-mono">₹{p.offerPrice || p.mrp}</span>
                            </div>
                          </div>
                        </td>

                        {/* Master Live Switch */}
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => handleToggleWebsiteVisibility(p)}
                            disabled={isSaving}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all inline-flex items-center gap-1.5 ${
                              p.showOnWebsite
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-slate-100 text-slate-500 border border-slate-300"
                            }`}
                          >
                            {p.showOnWebsite ? <Eye className="w-3.5 h-3.5 text-emerald-700" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                            <span>{p.showOnWebsite ? "LIVE" : "HIDDEN"}</span>
                          </button>
                        </td>

                        {/* Homepage Sections Multi-Checkboxes */}
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {SECTION_KEYS.map((sec) => {
                              const checked = sections.includes(sec.key);
                              return (
                                <label
                                  key={sec.key}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold cursor-pointer border transition-all flex items-center gap-1 ${
                                    checked
                                      ? sec.color + " shadow-2xs"
                                      : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300"
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => handleSectionCheckboxToggle(p, sec.key)}
                                    className="rounded text-[#056468] focus:ring-0"
                                  />
                                  <span>{sec.key}</span>
                                </label>
                              );
                            })}
                          </div>
                        </td>

                        {/* Badge Dropdown */}
                        <td className="p-3.5">
                          <select
                            value={p.badge || "None"}
                            onChange={(e) =>
                              handleUpdateProductPlacement(p.id, {
                                badge: e.target.value === "None" ? null : e.target.value,
                              })
                            }
                            className="bg-slate-50 border border-[#cce7ed] rounded-lg px-2.5 py-1 text-xs text-[#0b252c] font-medium focus:outline-none focus:border-[#056468]"
                          >
                            {BADGE_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Display Order Sequence */}
                        <td className="p-3.5">
                          <input
                            type="number"
                            defaultValue={p.displayOrder ?? 99}
                            onBlur={(e) =>
                              handleUpdateProductPlacement(p.id, {
                                displayOrder: parseInt(e.target.value) || 99,
                              })
                            }
                            className="w-14 bg-slate-50 border border-[#cce7ed] rounded-lg px-2 py-1 text-xs font-mono font-semibold text-[#0b252c] text-center"
                          />
                        </td>

                        {/* Status badge */}
                        <td className="p-3.5 text-right">
                          <span className="text-[10px] font-mono text-slate-400">
                            {isSaving ? "Saving..." : "Updated"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: WEBSITE INTEGRATION GUIDE & SCHEMAS */}
      {activeTab === "docs" && (
        <div className="space-y-6">
          <div className="bg-white border border-[#cce7ed] rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-[#0b252c] flex items-center gap-2">
              <Code className="w-5 h-5 text-[#056468]" />
              Storefront Frontend Integration Specification (Next.js / React)
            </h2>
            <p className="text-xs text-slate-500">
              Copy & paste the filtering logic into your main storefront repository (<code className="bg-[#f2f9fa] px-1.5 py-0.5 rounded text-[#056468] font-mono">index.tsx</code>).
            </p>

            {/* Code snippet block */}
            <div className="bg-slate-950 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800 space-y-2">
              <div className="text-slate-400">// Fetch products with master visibility switch</div>
              <div>const res = await fetch("https://your-domain.com/api/products?showOnWebsite=true");</div>
              <div>const liveProducts = await res.json();</div>
              <br />
              <div className="text-[#056468]">// 1. Featured Section ("New and notable" carousel)</div>
              <div>const featured = liveProducts</div>
              <div>{"  "}.filter((p) =&gt; p.featured === true || p.homepageSections?.includes("FEATURED"))</div>
              <div>{"  "}.sort((a, b) =&gt; (a.displayOrder ?? 99) - (b.displayOrder ?? 99))</div>
              <div>{"  "}.slice(0, 8);</div>
              <br />
              <div className="text-amber-400">// 2. Best Sellers Section ("What customers buy most")</div>
              <div>const bestSellers = liveProducts</div>
              <div>{"  "}.filter((p) =&gt; p.badge === "Best Seller" || p.homepageSections?.includes("BEST_SELLER"))</div>
              <div>{"  "}.sort((a, b) =&gt; (a.displayOrder ?? 99) - (b.displayOrder ?? 99))</div>
              <div>{"  "}.slice(0, 8);</div>
              <br />
              <div className="text-purple-400">// 3. Hero Banner Spotlight (1-3 highlighted products)</div>
              <div>const heroSpotlight = liveProducts.filter((p) =&gt; p.homepageSections?.includes("HERO"));</div>
            </div>
          </div>

          <div className="bg-white border border-[#cce7ed] rounded-2xl p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-[#0b252c]">Example MongoDB Document Structure</h3>
            <pre className="bg-[#f2f9fa] border border-[#cce7ed] p-4 rounded-xl text-xs font-mono text-[#0b252c] overflow-x-auto">
{JSON.stringify(
  liveProducts[0] || {
    _id: "prod_micawas_4k",
    name: "Micawas Pro 4K WiFi Outdoor Security Camera",
    slug: "micawas-pro-4k-wifi-outdoor-security-camera",
    showOnWebsite: true,
    featured: true,
    badge: "Best Seller",
    homepageSections: ["HERO", "FEATURED", "BEST_SELLER"],
    displayOrder: 1,
    productType: "PRODUCT",
    categorySlug: "security-gadgets",
    offerPrice: 4999,
    mrp: 6999,
    imageUrl: "https://res.cloudinary.com/drxzuvrbq/image/upload/...",
    status: "ACTIVE",
  },
  null,
  2
)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
