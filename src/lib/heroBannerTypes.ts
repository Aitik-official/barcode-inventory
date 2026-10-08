export interface HeroBanner {
  _id: string;               // Unique ID (e.g. "hero_banner_01")
  title: string;             // Main Headline Text
  subtitle: string;          // Subtitle / Description Paragraph
  badge?: string;            // Top Tag / Pill (e.g. "Live Catalog · India-Wide Shipping")
  tagline?: string;          // Brand Tagline above title (e.g. "MiCaWas")
  imageUrl: string;          // Desktop Banner Image URL (Cloudinary / CDN / Local)
  mobileImageUrl?: string;   // Mobile-Optimized Banner Image URL (Optional)
  ctaText: string;           // Primary CTA Button Text (e.g. "Shop Collection")
  ctaLink: string;           // Primary CTA Button Link (e.g. "/shop")
  secondaryCtaText?: string; // Secondary Button Text (e.g. "How It Works")
  secondaryCtaLink?: string; // Secondary Button Link (e.g. "/how-it-works")
  status: "ACTIVE" | "INACTIVE"; // Visibility Status
  displayOrder: number;      // Sequence Order (1, 2, 3...)
  createdAt: string;         // ISO Date String
  updatedAt: string;         // ISO Date String
}

export const DEFAULT_HERO_BANNER: HeroBanner = {
  _id: "hero_banner_01",
  title: "Security You Can Hold in Your Palm",
  subtitle: "Mini cameras, WiFi monitors, GPS trackers and detectors — lab-tested for homes, shops and offices across India.",
  badge: "Live Catalog · India-Wide Shipping",
  tagline: "MiCaWas",
  imageUrl: "/assets/hero-camera.jpg",
  mobileImageUrl: "/assets/hero-camera.jpg",
  ctaText: "Shop Collection",
  ctaLink: "/shop",
  secondaryCtaText: "How It Works",
  secondaryCtaLink: "/how-it-works",
  status: "ACTIVE",
  displayOrder: 1,
  createdAt: "2026-10-07T12:13:24.770Z",
  updatedAt: "2026-10-07T12:13:24.770Z",
};
