import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppNav } from "@/components/AppNav";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "BarcodeZaa — Unified Inventory & Unit Barcode Platform",
  description: "Unified B2B Catalog, Inventory Ledger, and Per-Unit Serial Barcode Engine",
  icons: {
    icon: "/logo/favicon.png",
    shortcut: "/logo/favicon.png",
    apple: "/logo/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-[#e3f2f5] text-[#0b252c] font-sans antialiased flex flex-col">
        <AppNav />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="border-t border-[#cce7ed] bg-white/70 py-5 text-center text-xs text-[#4a6870]">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="font-medium">
              <strong className="text-[#056468] font-bold">BarcodeZaa</strong> — B2B Catalog & Unit-Level Serial Barcode Engine
            </p>
            <div className="flex items-center gap-4 text-[#5f818b] text-[11px]">
              <span>Code 128 Standard</span>
              <span>•</span>
              <span>Thermal Labels: 50x30mm, 50x25mm, 75x50mm, 100x50mm</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
