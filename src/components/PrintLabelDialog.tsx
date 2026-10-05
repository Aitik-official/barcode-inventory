"use client";

import { useState } from "react";
import { BarcodeSvg } from "./BarcodeSvg";
import { Printer, ChevronLeft, ChevronRight, Eye, Sparkles, CheckCircle2, Sliders, Tag } from "lucide-react";

export interface PrintLabelItem {
  productName: string;
  sku: string;
  price?: number;
  barcode: string;
  serialNumber?: number;
  brand?: string;
}

interface PrintLabelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  productName?: string;
  sku?: string;
  price?: number;
  barcode?: string;
  barcodes?: string[];
  items?: PrintLabelItem[];
  serialNumber?: number;
  startSerialNumber?: number;
  totalUnits?: number;
  brand?: string;
}

export function PrintLabelDialog({
  isOpen,
  onClose,
  productName = "Product",
  sku = "SKU",
  price = 0,
  barcode,
  barcodes,
  items,
  serialNumber,
  startSerialNumber = 1,
  totalUnits,
  brand,
}: PrintLabelDialogProps) {
  const [labelSize, setLabelSize] = useState("50x50");
  const [copies, setCopies] = useState(1);
  const [brandText, setBrandText] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("barcodezaa_default_brand") || brand || "MICAWAS";
    }
    return brand || "MICAWAS";
  });
  const [showPrice, setShowPrice] = useState(true);
  const [activeItemIndex, setActiveItemIndex] = useState(0);

  if (!isOpen) return null;

  // Build the list of items to print
  let printItems: PrintLabelItem[] = [];
  if (items && items.length > 0) {
    printItems = items;
  } else if (barcodes && barcodes.length > 0) {
    printItems = barcodes.map((b, idx) => ({
      productName,
      sku,
      price,
      barcode: b,
      serialNumber: serialNumber !== undefined ? serialNumber : startSerialNumber + idx,
      brand: brandText,
    }));
  } else if (barcode) {
    printItems = [
      {
        productName,
        sku,
        price,
        barcode,
        serialNumber,
        brand: brandText,
      },
    ];
  }

  const currentItem = printItems[activeItemIndex] || printItems[0] || {
    productName,
    sku,
    price,
    barcode: barcode || "000000000000",
    serialNumber: 1,
    brand: brandText,
  };

  const sizesMeta: Record<string, { w: number; h: number; name: string; desc: string }> = {
    "50x50": { w: 50, h: 50, name: "50 × 50 mm (1-Up Chromo Roll)", desc: "Exact square physical label roll (1000 pcs roll)" },
    "50x30": { w: 50, h: 30, name: "50 × 30 mm (Standard Retail)", desc: "Standard retail barcode label" },
    "50x25": { w: 50, h: 25, name: "50 × 25 mm (Small Garment Tag)", desc: "Compact apparel / accessory sticker" },
    "75x50": { w: 75, h: 50, name: "75 × 50 mm (Warehouse Tag)", desc: "Warehouse bin & shelf label" },
    "100x50": { w: 100, h: 50, name: "100 × 50 mm (Carton Box)", desc: "Outer carton shipping tag" },
    "100x150": { w: 100, h: 150, name: "100 × 150 mm (4×6\" Shipping Parcel)", desc: "Amazon / Flipkart Courier Parcel Invoice" },
  };

  const currentSize = sizesMeta[labelSize] || sizesMeta["50x50"];
  const is50x50 = labelSize === "50x50";

  const handlePrint = () => {
    // Open a temporary printable window formatted for thermal printers
    const printWindow = window.open("", "_blank", "width=650,height=700");
    if (!printWindow) {
      alert("Please allow popups to print labels.");
      return;
    }

    const s = sizesMeta[labelSize] || { w: 50, h: 50 };

    // If copies > 1 on single item, duplicate it
    let itemsToPrint = printItems;
    if (printItems.length === 1 && copies > 1) {
      itemsToPrint = Array(copies).fill(printItems[0]);
    }

    const labelsHtml = itemsToPrint
      .map((item, idx) => {
        const itemBrand = brandText || "MICAWAS";
        const priceHtml = showPrice ? `<div class="price">MRP: ₹${(item.price || 0).toFixed(2)}</div>` : `<div></div>`;

        return `
          <div class="label-page">
            <div class="brand-header">${itemBrand}</div>
            <div class="name">${item.productName}</div>
            <div class="meta">SKU: <strong>${item.sku}</strong></div>
            <div class="barcode-box">
              <svg id="bc-svg-${idx}"></svg>
            </div>
            <div class="footer-row">
              ${priceHtml}
              <div class="origin">PACKED IN INDIA</div>
            </div>
          </div>
        `;
      })
      .join("");

    const jsBarcodeInit = itemsToPrint
      .map(
        (item, idx) => `
        JsBarcode("#bc-svg-${idx}", "${item.barcode}", {
          format: "CODE128",
          width: ${is50x50 ? 1.4 : labelSize === "50x30" ? 1.25 : labelSize === "50x25" ? 1.15 : 1.5},
          height: ${is50x50 ? 25 : labelSize === "50x30" ? 18 : labelSize === "50x25" ? 15 : 30},
          displayValue: true,
          fontSize: ${is50x50 ? 8.5 : 7.5},
          font: "monospace",
          textMargin: 0,
          margin: 0
        });
      `
      )
      .join("\n");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Thermal Print (${itemsToPrint.length} Labels)</title>
          <style>
            @page {
              size: ${s.w}mm ${s.h}mm;
              margin: 0mm;
            }
            * {
              box-sizing: border-box !important;
              margin: 0;
              padding: 0;
            }
            html, body {
              width: ${s.w}mm;
              height: ${s.h}mm;
              margin: 0 !important;
              padding: 0 !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              background: #fff;
              color: #000;
              -webkit-print-color-adjust: exact;
              overflow: hidden !important;
            }
            .label-page {
              width: ${s.w}mm !important;
              height: ${s.h}mm !important;
              max-height: ${s.h}mm !important;
              box-sizing: border-box !important;
              padding: ${is50x50 ? "4mm 3mm 4.5mm 3mm" : "2mm 2mm 2.5mm 2mm"} !important;
              margin: 0 auto !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              align-items: center !important;
              text-align: center !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              overflow: hidden !important;
              border: none !important;
            }
            .label-page:not(:last-child) {
              page-break-after: always !important;
              break-after: page !important;
            }
            .label-page:last-child {
              page-break-after: avoid !important;
              break-after: avoid !important;
            }
            .brand-header {
              font-size: 8px;
              font-weight: 800;
              letter-spacing: 1.2px;
              text-transform: uppercase;
              color: #000;
              border-bottom: 0.75px solid #000;
              width: 100%;
              padding-bottom: 0.5px;
              margin: 0;
              line-height: 1;
              flex-shrink: 0;
            }
            .name {
              font-size: 8px;
              font-weight: 700;
              max-width: 96%;
              line-height: 1.1;
              max-height: 15px;
              overflow: hidden;
              text-overflow: ellipsis;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              margin: 0.5px 0;
              flex-shrink: 0;
            }
            .meta {
              font-size: 7.5px;
              color: #000;
              font-family: monospace;
              font-weight: 600;
              line-height: 1;
              margin: 0.5px 0;
              flex-shrink: 0;
            }
            .barcode-box {
              width: 100%;
              flex: 1;
              min-height: 0;
              display: flex;
              justify-content: center;
              align-items: center;
              margin: 0;
              overflow: hidden;
            }
            .barcode-box svg {
              max-width: 96%;
              max-height: 100%;
              display: block;
            }
            .footer-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              width: 100%;
              border-top: 0.75px solid #000;
              padding-top: 1px;
              margin: 0;
              line-height: 1;
              flex-shrink: 0;
            }
            .price {
              font-size: 8.5px;
              font-weight: 800;
              color: #000;
            }
            .origin {
              font-size: 7px;
              font-weight: 700;
              color: #000;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
          </style>
        </head>
        <body>
          ${labelsHtml}
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <script>
            window.onload = function() {
              ${jsBarcodeInit}
              setTimeout(function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 500);
              }, 300);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 overflow-y-auto pointer-events-auto">
      <div className="relative z-[10000] bg-white border border-[#cce7ed] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5 text-slate-800 animate-in fade-in zoom-in-95 my-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Printer className="w-5 h-5 text-[#056468]" />
              <span>Exact Thermal Label Print Preview</span>
            </h3>
            <p className="text-xs text-slate-500 font-normal mt-0.5">
              {printItems.length > 1
                ? `Batch printing ${printItems.length} sequential unit labels on ${currentSize.name}`
                : `Previewing thermal sticker on ${currentSize.name}`}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>

        {/* BATCH STEPPER NAVIGATOR */}
        {printItems.length > 1 && (
          <div className="bg-[#f2f9fa] border border-[#cce7ed] rounded-xl px-3.5 py-2 flex items-center justify-between text-xs">
            <div className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#056468]" />
              <span>
                Label <strong className="text-[#056468]">{activeItemIndex + 1}</strong> of {printItems.length} in Batch
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={activeItemIndex === 0}
                onClick={() => setActiveItemIndex((prev) => Math.max(0, prev - 1))}
                className="p-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-all"
                title="Previous Label"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono font-bold text-[11px] px-2 text-[#056468]">
                Unit #{currentItem.serialNumber || activeItemIndex + 1}
              </span>
              <button
                type="button"
                disabled={activeItemIndex === printItems.length - 1}
                onClick={() => setActiveItemIndex((prev) => Math.min(printItems.length - 1, prev + 1))}
                className="p-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-all"
                title="Next Label"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* WYSIWYG REAL-LIFE THERMAL LABEL PREVIEW (Matches 100% with the physical printed sticker!) */}
        <div className="bg-slate-100/80 rounded-2xl p-6 border border-slate-200 flex flex-col items-center justify-center space-y-2 shadow-inner">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#056468] uppercase tracking-wider mb-1">
            <Eye className="w-3.5 h-3.5" />
            <span>Exact Printed Thermal Sticker Layout ({currentSize.w}mm × {currentSize.h}mm)</span>
          </div>

          {/* PHYSICAL THERMAL STICKER SIMULATION */}
          <div
            className="bg-white rounded-lg shadow-md border border-slate-300 p-3 flex flex-col justify-between items-center text-center transition-all duration-200 select-none"
            style={{
              width: is50x50 ? "200px" : "240px",
              height: is50x50 ? "200px" : labelSize === "50x30" ? "140px" : "130px",
              aspectRatio: `${currentSize.w} / ${currentSize.h}`,
            }}
          >
            {/* Top Brand Header */}
            <div className="w-full border-b border-black pb-0.5 mb-0.5 flex items-center justify-between">
              <span className="text-[9px] font-black tracking-widest uppercase text-black font-sans w-full text-center">
                {brandText || "MICAWAS"}
              </span>
            </div>

            {/* Product Title */}
            <div className="font-bold text-[9.5px] text-black leading-tight line-clamp-2 max-w-[95%] my-0.5">
              {currentItem.productName}
            </div>

            {/* SKU */}
            <div className="text-[8.5px] font-mono text-slate-800 font-semibold my-0.5">
              SKU: <span className="font-bold text-black">{currentItem.sku}</span>
            </div>

            {/* Code 128 SVG Barcode */}
            <div className="w-full my-0.5 flex flex-col items-center justify-center bg-white flex-1 min-h-0">
              <BarcodeSvg
                barcode={currentItem.barcode}
                height={is50x50 ? 30 : 20}
                width={1.4}
                fontSize={9}
              />
            </div>

            {/* Bottom Footer (MRP & Origin) */}
            <div className="w-full border-t border-black pt-0.5 mt-0.5 flex items-center justify-between text-[8.5px]">
              {showPrice ? (
                <div className="font-black text-black text-[9.5px]">
                  MRP: ₹{(currentItem.price || 0).toFixed(2)}
                </div>
              ) : (
                <div className="text-[8px] text-slate-500 font-mono">CODE 128</div>
              )}
              <div className="font-bold uppercase tracking-wider text-[7.5px] text-slate-800">
                PACKED IN INDIA
              </div>
            </div>
          </div>

          <div className="text-[10.5px] text-emerald-800 font-medium bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <span>✨</span>
            <span><strong>Zero-Spill Calibration Active:</strong> Set <strong>Margins: None</strong> in Chrome print window for 1-to-1 exact physical sticker alignment.</span>
          </div>
        </div>

        {/* Configuration Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Target Label Roll Size</label>
            <select
              value={labelSize}
              onChange={(e) => setLabelSize(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-[#056468]"
            >
              <option value="50x50">50 × 50 mm — 1-Up Chromo Roll (Your Physical Roll)</option>
              <option value="50x30">50 × 30 mm — Standard Retail Tag</option>
              <option value="50x25">50 × 25 mm — Small Apparel / Jewelry Tag</option>
              <option value="75x50">75 × 50 mm — Warehouse / Shelf Tag</option>
              <option value="100x50">100 × 50 mm — Carton Box Tag</option>
              <option value="100x150">100 × 150 mm — 4×6" Parcel Shipping Invoice</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-slate-700">Brand Header on Sticker</label>
              <span className="text-[10px] text-emerald-700 font-semibold">Saved as default</span>
            </div>
            <input
              type="text"
              value={brandText}
              onChange={(e) => {
                const val = e.target.value;
                setBrandText(val);
                try {
                  localStorage.setItem("barcodezaa_default_brand", val);
                } catch {}
              }}
              placeholder="e.g. Micawas"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:ring-2 focus:ring-[#056468]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showPrice}
              onChange={(e) => setShowPrice(e.target.checked)}
              className="rounded text-[#056468] focus:ring-[#056468]"
            />
            <span className="font-semibold text-slate-700">Print MRP / Selling Price on Label</span>
          </label>

          {printItems.length === 1 && (
            <div className="flex items-center gap-2">
              <label className="font-bold text-slate-700">Copies:</label>
              <input
                type="number"
                min="1"
                max="1000"
                value={copies}
                onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 bg-white border border-slate-200 rounded-xl px-2 py-1 text-slate-800 font-mono font-bold text-center"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 text-xs font-bold hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#056468] hover:bg-[#044e51] text-white text-xs font-bold shadow-md transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>
              {printItems.length > 1
                ? `Print All ${printItems.length} Batch Labels`
                : copies > 1
                ? `Print ${copies} Copies`
                : "Print Thermal Label"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
