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
  Image as ImageIcon,
  ExternalLink,
  Layers,
} from "lucide-react";
import { HeroBanner, DEFAULT_HERO_BANNER } from "@/lib/heroBannerTypes";

export default function WebsiteClient({
  products: initialProducts,
  categories,
  initialHeroBanners = [],
}: {
  products: any[];
  categories: any[];
  initialHeroBanners?: HeroBanner[];
}) {
  const [products, setProducts] = useState<any[]>(initialProducts);
  const [heroBanner, setHeroBanner] = useState<HeroBanner>(
    initialHeroBanners?.[0] || DEFAULT_HERO_BANNER
  );
  const [activeTab, setActiveTab] = useState<"hero" | "preview" | "controls" | "docs">("hero");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isSavingHero, setIsSavingHero] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Homepage Placement Sections (Hero Spotlight is flagship-only and managed separately)
  const SECTION_KEYS = [
    {
      key: "FEATURED",
      label: "Featured Products (Tab 1)",
      shortLabel: "FEATURED",
      desc: "Homepage Tab 1 primary 3×3 / 4×4 product grid",
      color: "bg-[#e3f2f5] text-[#056468] border-[#cce7ed]",
    },
    {
      key: "NEW_ARRIVALS",
      label: "New Arrivals (Tab 2)",
      shortLabel: "NEW_ARRIVALS",
      desc: "Homepage Tab 2 filtered for new gadget releases",
      color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    {
      key: "DEALS",
      label: "Limited Deals (Tab 3)",
      shortLabel: "DEALS",
      desc: "Homepage Tab 3 (Hot Deals & discount ≥20%)",
      color: "bg-rose-50 text-rose-700 border-rose-200",
    },
    {
      key: "BEST_SELLER",
      label: "Best Sellers Carousel",
      shortLabel: "BEST_SELLER",
      desc: "Auto-Scrolling Best Sellers looping carousel",
      color: "bg-amber-50 text-amber-700 border-amber-200",
    },
  ];

  const BADGE_OPTIONS = ["None", "Best Seller", "New", "HD 1080p", "Hot Deal", "Trending"];

  const handleSaveHeroBanner = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingHero(true);
    try {
      const res = await fetch("/api/website/hero", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(heroBanner),
      });

      if (!res.ok) throw new Error("Failed to save hero banner");

      const saved = await res.json();
      setHeroBanner(saved);
      setSaveSuccessMsg("Hero spotlight banner saved & published successfully!");
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSavingHero(false);
    }
  };

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

  const featuredProducts = liveProducts
    .filter((p) => p.featured || p.homepageSections?.includes("FEATURED"))
    .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));

  const newArrivalProducts = liveProducts
    .filter((p) => p.badge === "New" || p.homepageSections?.includes("NEW_ARRIVALS"))
    .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));

  const dealProducts = liveProducts
    .filter(
      (p) =>
        p.badge === "Hot Deal" ||
        p.homepageSections?.includes("DEALS") ||
        (p.mrp > 0 && p.offerPrice > 0 && (p.mrp - p.offerPrice) / p.mrp >= 0.2)
    )
    .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));

  const bestSellerProducts = liveProducts
    .filter((p) => p.badge === "Best Seller" || p.homepageSections?.includes("BEST_SELLER"))
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
            Control which products appear in each tab and section of the storefront homepage (<code className="bg-[#e3f2f5] px-1.5 py-0.5 rounded text-[#056468] font-mono">FEATURED</code>, <code className="bg-emerald-50 px-1.5 py-0.5 rounded text-emerald-700 font-mono">NEW_ARRIVALS</code>, <code className="bg-rose-50 px-1.5 py-0.5 rounded text-rose-700 font-mono">DEALS</code>, <code className="bg-amber-50 px-1.5 py-0.5 rounded text-amber-700 font-mono">BEST_SELLER</code>).
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white border border-[#cce7ed] rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Storefront Live</div>
          <div className="text-2xl font-bold text-[#056468] mt-0.5">{liveProducts.length}</div>
          <div className="text-[11px] text-slate-400">Master switch = ON</div>
        </div>

        <div className="bg-white border border-[#cce7ed] rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Tab 1: Featured</div>
          <div className="text-2xl font-bold text-[#056468] mt-0.5">{featuredProducts.length}</div>
          <div className="text-[11px] text-[#056468]">FEATURED Section</div>
        </div>

        <div className="bg-white border border-[#cce7ed] rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Tab 2: New Arrivals</div>
          <div className="text-2xl font-bold text-emerald-700 mt-0.5">{newArrivalProducts.length}</div>
          <div className="text-[11px] text-emerald-600">NEW_ARRIVALS Section</div>
        </div>

        <div className="bg-white border border-[#cce7ed] rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Tab 3: Limited Deals</div>
          <div className="text-2xl font-bold text-rose-700 mt-0.5">{dealProducts.length}</div>
          <div className="text-[11px] text-rose-600">DEALS Section / ≥20% Off</div>
        </div>

        <div className="bg-white border border-[#cce7ed] rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Best Sellers Carousel</div>
          <div className="text-2xl font-bold text-amber-700 mt-0.5">{bestSellerProducts.length}</div>
          <div className="text-[11px] text-amber-600">BEST_SELLER Carousel</div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-[#cce7ed] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("hero")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === "hero"
              ? "bg-[#056468] text-white shadow-sm"
              : "text-slate-600 hover:text-[#0b252c] hover:bg-white/60"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Hero Banner Spotlight (First Fold)
        </button>

        <button
          onClick={() => setActiveTab("preview")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === "preview"
              ? "bg-[#056468] text-white shadow-sm"
              : "text-slate-600 hover:text-[#0b252c] hover:bg-white/60"
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          Homepage Tabs & Carousel Previews
        </button>

        <button
          onClick={() => setActiveTab("controls")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
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
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === "docs"
              ? "bg-[#056468] text-white shadow-sm"
              : "text-slate-600 hover:text-[#0b252c] hover:bg-white/60"
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          Website Integration Guide & Schemas
        </button>
      </div>

      {/* TAB 0: HERO BANNER SPOTLIGHT MANAGER */}
      {activeTab === "hero" && (
        <div className="space-y-6">
          {/* Live Storefront Hero Preview */}
          <div className="bg-gradient-to-br from-[#0b252c] via-[#054146] to-[#0b252c] text-white rounded-3xl p-6 sm:p-10 border border-[#0b3c43] shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column Text & CTAs */}
              <div className="lg:col-span-7 space-y-4">
                {heroBanner.badge && (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/20 text-emerald-300 text-xs font-semibold backdrop-blur-xs">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{heroBanner.badge}</span>
                  </div>
                )}

                {heroBanner.tagline && (
                  <div className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                    {heroBanner.tagline}
                  </div>
                )}

                <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight text-white">
                  {heroBanner.title || "Security You Can Hold in Your Palm"}
                </h2>

                <p className="text-emerald-100/90 text-sm sm:text-base leading-relaxed max-w-xl">
                  {heroBanner.subtitle ||
                    "Mini cameras, WiFi monitors, GPS trackers and detectors — lab-tested for homes, shops and offices across India."}
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <a
                    href={heroBanner.ctaLink || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-[#044e51] font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                  >
                    <span>{heroBanner.ctaText || "Shop Collection"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>

                  {heroBanner.secondaryCtaText && (
                    <a
                      href={heroBanner.secondaryCtaLink || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all flex items-center gap-2"
                    >
                      <span>{heroBanner.secondaryCtaText}</span>
                    </a>
                  )}

                  <span className="text-[11px] text-emerald-200/70 font-mono ml-2">
                    Status: <strong className={heroBanner.status === "ACTIVE" ? "text-emerald-300" : "text-amber-300"}>{heroBanner.status}</strong>
                  </span>
                </div>
              </div>

              {/* Right Column Image Preview */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="relative w-full max-w-sm rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-slate-900/50 aspect-4/3 flex items-center justify-center">
                  {heroBanner.imageUrl ? (
                    <img
                      src={heroBanner.imageUrl}
                      alt={heroBanner.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="text-center p-6 text-emerald-200/60 text-xs flex flex-col items-center gap-2">
                      <ImageIcon className="w-8 h-8 text-emerald-400" />
                      <span>Desktop & Mobile Banner Preview</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Hero Banner Editor Form */}
          <div className="bg-white border border-[#cce7ed] rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#0b252c] flex items-center gap-2">
                  <Settings className="w-4 h-4 text-[#056468]" />
                  <span>Configure Hero Spotlight Banner Parameters</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update primary headline, pill badge, call-to-action buttons, and banner media for the storefront first fold.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveHeroBanner}
                disabled={isSavingHero}
                className="px-5 py-2.5 bg-[#056468] hover:bg-[#044e51] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingHero ? "Saving..." : "Save Hero Banner"}</span>
              </button>
            </div>

            <form onSubmit={handleSaveHeroBanner} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Title */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#0b252c] mb-1">
                    Main Headline Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={heroBanner.title}
                    onChange={(e) => setHeroBanner({ ...heroBanner, title: e.target.value })}
                    placeholder="Security You Can Hold in Your Palm"
                    className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl px-3.5 py-2.5 text-sm font-bold text-[#0b252c] focus:outline-none focus:border-[#056468]"
                    required
                  />
                </div>

                {/* Subtitle */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#0b252c] mb-1">
                    Subtitle Description Paragraph <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={heroBanner.subtitle}
                    onChange={(e) => setHeroBanner({ ...heroBanner, subtitle: e.target.value })}
                    placeholder="Mini cameras, WiFi monitors, GPS trackers and detectors — lab-tested for homes, shops and offices across India."
                    className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl p-3 text-xs text-[#0b252c] leading-relaxed focus:outline-none focus:border-[#056468]"
                    required
                  />
                </div>

                {/* Top Badge */}
                <div>
                  <label className="block text-xs font-bold text-[#0b252c] mb-1">
                    Top Tag / Badge Pill
                  </label>
                  <input
                    type="text"
                    value={heroBanner.badge || ""}
                    onChange={(e) => setHeroBanner({ ...heroBanner, badge: e.target.value })}
                    placeholder="Live Catalog · India-Wide Shipping"
                    className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl px-3 py-2 text-xs text-[#0b252c] focus:outline-none focus:border-[#056468]"
                  />
                </div>

                {/* Tagline */}
                <div>
                  <label className="block text-xs font-bold text-[#0b252c] mb-1">
                    Brand Tagline
                  </label>
                  <input
                    type="text"
                    value={heroBanner.tagline || ""}
                    onChange={(e) => setHeroBanner({ ...heroBanner, tagline: e.target.value })}
                    placeholder="MiCaWas"
                    className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl px-3 py-2 text-xs text-[#0b252c] focus:outline-none focus:border-[#056468]"
                  />
                </div>

                {/* Desktop Image URL */}
                <div>
                  <label className="block text-xs font-bold text-[#0b252c] mb-1">
                    Desktop Banner Image URL <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={heroBanner.imageUrl}
                    onChange={(e) => setHeroBanner({ ...heroBanner, imageUrl: e.target.value })}
                    placeholder="/assets/hero-camera.jpg or https://res.cloudinary.com/..."
                    className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl px-3 py-2 text-xs font-mono text-[#0b252c] focus:outline-none focus:border-[#056468]"
                    required
                  />
                </div>

                {/* Mobile Image URL */}
                <div>
                  <label className="block text-xs font-bold text-[#0b252c] mb-1">
                    Mobile Banner Image URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={heroBanner.mobileImageUrl || ""}
                    onChange={(e) => setHeroBanner({ ...heroBanner, mobileImageUrl: e.target.value })}
                    placeholder="/assets/hero-camera.jpg"
                    className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl px-3 py-2 text-xs font-mono text-[#0b252c] focus:outline-none focus:border-[#056468]"
                  />
                </div>

                {/* Primary CTA */}
                <div>
                  <label className="block text-xs font-bold text-[#0b252c] mb-1">
                    Primary CTA Button Text
                  </label>
                  <input
                    type="text"
                    value={heroBanner.ctaText}
                    onChange={(e) => setHeroBanner({ ...heroBanner, ctaText: e.target.value })}
                    placeholder="Shop Collection"
                    className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl px-3 py-2 text-xs text-[#0b252c] focus:outline-none focus:border-[#056468]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0b252c] mb-1">
                    Primary CTA Link
                  </label>
                  <input
                    type="text"
                    value={heroBanner.ctaLink}
                    onChange={(e) => setHeroBanner({ ...heroBanner, ctaLink: e.target.value })}
                    placeholder="/shop"
                    className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl px-3 py-2 text-xs font-mono text-[#0b252c] focus:outline-none focus:border-[#056468]"
                    required
                  />
                </div>

                {/* Secondary CTA */}
                <div>
                  <label className="block text-xs font-bold text-[#0b252c] mb-1">
                    Secondary Button Text (Optional)
                  </label>
                  <input
                    type="text"
                    value={heroBanner.secondaryCtaText || ""}
                    onChange={(e) => setHeroBanner({ ...heroBanner, secondaryCtaText: e.target.value })}
                    placeholder="How It Works"
                    className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl px-3 py-2 text-xs text-[#0b252c] focus:outline-none focus:border-[#056468]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0b252c] mb-1">
                    Secondary Button Link (Optional)
                  </label>
                  <input
                    type="text"
                    value={heroBanner.secondaryCtaLink || ""}
                    onChange={(e) => setHeroBanner({ ...heroBanner, secondaryCtaLink: e.target.value })}
                    placeholder="/how-it-works"
                    className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl px-3 py-2 text-xs font-mono text-[#0b252c] focus:outline-none focus:border-[#056468]"
                  />
                </div>

                {/* Status & Display Order */}
                <div>
                  <label className="block text-xs font-bold text-[#0b252c] mb-1">
                    Visibility Status
                  </label>
                  <select
                    value={heroBanner.status}
                    onChange={(e) => setHeroBanner({ ...heroBanner, status: e.target.value as any })}
                    className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl px-3 py-2 text-xs font-bold text-[#0b252c] focus:outline-none focus:border-[#056468]"
                  >
                    <option value="ACTIVE">ACTIVE (Published on Storefront)</option>
                    <option value="INACTIVE">INACTIVE (Hidden)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0b252c] mb-1">
                    Display Order Sequence
                  </label>
                  <input
                    type="number"
                    value={heroBanner.displayOrder}
                    onChange={(e) => setHeroBanner({ ...heroBanner, displayOrder: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl px-3 py-2 text-xs font-mono text-[#0b252c] focus:outline-none focus:border-[#056468]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingHero}
                  className="px-6 py-2.5 bg-[#056468] hover:bg-[#044e51] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingHero ? "Saving Changes..." : "Publish Hero Banner"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 1: HOMEPAGE LIVE SECTION PREVIEWS */}
      {activeTab === "preview" && (
        <div className="space-y-8">
          {/* Section 1: Featured Products (Homepage Tab 1) */}
          <div className="bg-white border border-[#cce7ed] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-[#0b252c] flex items-center gap-2">
                  <Star className="w-5 h-5 text-[#056468]" />
                  Homepage Tab 1: Featured Products (<code className="text-[#056468] font-mono">FEATURED</code>)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Shown in the primary 3×3 / 4×4 product grid under Featured Tab on the storefront homepage.
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-md bg-[#e3f2f5] text-[#056468] font-medium border border-[#cce7ed]">
                {featuredProducts.length} Items Assigned
              </span>
            </div>

            {featuredProducts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs bg-[#f2f9fa] rounded-xl border border-dashed border-[#cce7ed]">
                No products assigned to FEATURED section yet. Go to Placement Controls tab and check "FEATURED".
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {featuredProducts.map((p) => (
                  <div key={p.id} className="bg-white border border-[#cce7ed] rounded-xl p-3 space-y-2 shadow-xs hover:border-[#056468] transition-all">
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

          {/* Section 2: New Arrivals (Homepage Tab 2) */}
          <div className="bg-white border border-[#cce7ed] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-[#0b252c] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                  Homepage Tab 2: New Arrivals (<code className="text-emerald-700 font-mono">NEW_ARRIVALS</code>)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Filtered under the New Arrivals tab; automatically pulls items with badge "New" or tag NEW_ARRIVALS.
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                {newArrivalProducts.length} Items Assigned
              </span>
            </div>

            {newArrivalProducts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs bg-[#f2f9fa] rounded-xl border border-dashed border-[#cce7ed]">
                No products assigned to NEW_ARRIVALS section yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {newArrivalProducts.map((p) => (
                  <div key={p.id} className="bg-white border border-emerald-200 rounded-xl p-3 space-y-2 shadow-xs hover:border-emerald-500 transition-all">
                    <div className="relative h-32 w-full bg-[#f2f9fa] rounded-lg overflow-hidden flex items-center justify-center">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs text-slate-400">No Image</span>
                      )}
                      <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white shadow-xs">
                        {p.badge || "New"}
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

          {/* Section 3: Limited Deals (Homepage Tab 3) */}
          <div className="bg-white border border-[#cce7ed] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-[#0b252c] flex items-center gap-2">
                  <Flame className="w-5 h-5 text-rose-600" />
                  Homepage Tab 3: Limited Deals (<code className="text-rose-700 font-mono">DEALS</code>)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Shown under Deals tab; automatically highlights products with discount ≥ 20% or code DEALS.
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 font-medium border border-rose-200">
                {dealProducts.length} Items Assigned
              </span>
            </div>

            {dealProducts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs bg-[#f2f9fa] rounded-xl border border-dashed border-[#cce7ed]">
                No products assigned to DEALS section yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {dealProducts.map((p) => (
                  <div key={p.id} className="bg-white border border-rose-200 rounded-xl p-3 space-y-2 shadow-xs hover:border-rose-500 transition-all">
                    <div className="relative h-32 w-full bg-[#f2f9fa] rounded-lg overflow-hidden flex items-center justify-center">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs text-slate-400">No Image</span>
                      )}
                      <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded bg-rose-600 text-white shadow-xs">
                        {p.badge || "Hot Deal"}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-semibold text-xs text-[#0b252c] truncate">{p.name}</h4>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-rose-700">₹{p.offerPrice || p.mrp}</span>
                        <span className="text-[10px] text-slate-400 line-through">₹{p.mrp}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Auto-Scrolling Best Sellers Carousel */}
          <div className="bg-white border border-[#cce7ed] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-[#0b252c] flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-600" />
                  Auto-Scrolling Best Sellers Carousel (<code className="text-amber-700 font-mono">BEST_SELLER</code>)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Highlighted in the infinite looping carousel (rating ≥ 4.5 or badge "Best Seller" or tag BEST_SELLER).
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 font-medium border border-amber-200">
                {bestSellerProducts.length} Items Assigned
              </span>
            </div>

            {bestSellerProducts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs bg-[#f2f9fa] rounded-xl border border-dashed border-[#cce7ed]">
                No products assigned to BEST_SELLER carousel yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {bestSellerProducts.map((p) => (
                  <div key={p.id} className="bg-white border border-amber-200 rounded-xl p-3 space-y-2 shadow-xs hover:border-amber-500 transition-all">
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
              <div className="text-slate-400">// Fetch live published products from Barcode Inventory API</div>
              <div>const res = await fetch("https://your-domain.com/api/products?showOnWebsite=true");</div>
              <div>const liveProducts = await res.json();</div>
              <br />
              <div className="text-[#056468]">// 1. Featured Products — Homepage Tab 1 (Primary 3×3 / 4×4 Grid)</div>
              <div>const featuredProducts = liveProducts</div>
              <div>{"  "}.filter((p) =&gt; p.featured === true || p.homepageSections?.includes("FEATURED"))</div>
              <div>{"  "}.sort((a, b) =&gt; (a.displayOrder ?? 99) - (b.displayOrder ?? 99));</div>
              <br />
              <div className="text-emerald-400">// 2. New Arrivals — Homepage Tab 2 (New Releases)</div>
              <div>const newArrivals = liveProducts</div>
              <div>{"  "}.filter((p) =&gt; p.badge === "New" || p.homepageSections?.includes("NEW_ARRIVALS"))</div>
              <div>{"  "}.sort((a, b) =&gt; (a.displayOrder ?? 99) - (b.displayOrder ?? 99));</div>
              <br />
              <div className="text-rose-400">// 3. Limited Deals — Homepage Tab 3 (Discount ≥ 20% / Hot Deals)</div>
              <div>const limitedDeals = liveProducts</div>
              <div>{"  "}.filter((p) =&gt; p.badge === "Hot Deal" || p.homepageSections?.includes("DEALS") || ((p.mrp - p.offerPrice) / p.mrp &gt;= 0.2))</div>
              <div>{"  "}.sort((a, b) =&gt; (a.displayOrder ?? 99) - (b.displayOrder ?? 99));</div>
              <br />
              <div className="text-amber-400">// 4. Best Sellers Carousel — Auto-Scrolling Infinite Carousel</div>
              <div>const bestSellers = liveProducts</div>
              <div>{"  "}.filter((p) =&gt; p.badge === "Best Seller" || p.homepageSections?.includes("BEST_SELLER"))</div>
              <div>{"  "}.sort((a, b) =&gt; (a.displayOrder ?? 99) - (b.displayOrder ?? 99));</div>
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
