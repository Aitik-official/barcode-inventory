"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  ScanBarcode,
  Search,
  Receipt,
  FileText,
  Printer,
  Package,
  Truck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Store,
  Globe,
  Camera,
  X,
  Sparkles,
  Layers,
  MapPin,
  Phone,
  Mail,
  Building,
  User,
  Hash,
  ShoppingBag,
} from "lucide-react";
import { BarcodeSvg } from "@/components/BarcodeSvg";
import {
  PrintShippingInvoiceDialog,
  ShippingInvoiceData,
} from "@/components/PrintShippingInvoiceDialog";
import { CompanySettingsData, DEFAULT_COMPANY_SETTINGS } from "@/lib/companySettingsTypes";
import { Pagination } from "@/components/Pagination";

interface UnifiedInvoiceItem {
  id: string;
  invoiceNumber: string;
  orderNumber: string;
  orderDbId?: string;
  channel: "WEBSITE" | "AMAZON" | "FLIPKART" | "POS";
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  shippingAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
  totalAmount: number;
  subtotal: number;
  cgst: number;
  sgst: number;
  status: string;
  createdAt: string | Date;
  trackingNumber?: string;
  courier?: string;
  paymentMethod?: string;
  items: Array<{
    title: string;
    sku: string;
    asinOrFsn?: string;
    unitBarcode?: string;
    quantity: number;
    unitPrice: number;
    total: number;
    hsn?: string;
  }>;
}

export default function InvoicesClient({
  orders = [],
  marketplaceOrders = [],
  invoices = [],
  companySettings,
}: {
  orders: any[];
  marketplaceOrders: any[];
  invoices: any[];
  companySettings?: CompanySettingsData;
}) {
  const [searchInput, setSearchInput] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<UnifiedInvoiceItem | null>(null);
  const [channelFilter, setChannelFilter] = useState<"ALL" | "WEBSITE" | "AMAZON" | "FLIPKART" | "POS">("ALL");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Print Dialog State
  const [shippingInvoiceData, setShippingInvoiceData] = useState<ShippingInvoiceData | null>(null);
  const [invoiceModalMode, setInvoiceModalMode] = useState<"A4_INVOICE" | "THERMAL_LABEL">("A4_INVOICE");

  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-focus input on mount for handheld USB barcode scanners
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Listen for Escape key to close the popup modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedInvoice(null);
      }
    };
    if (selectedInvoice) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedInvoice]);

  // Map database orders & marketplace orders to unified invoice items
  const unifiedInvoices: UnifiedInvoiceItem[] = useMemo(() => {
    const list: UnifiedInvoiceItem[] = [];

    // 1. Direct Website & POS Orders
    orders.forEach((o) => {
      const dbInvoice = invoices.find((inv) => inv.orderId === o.id || inv.orderId === o.orderNumber);
      const invoiceNumber =
        dbInvoice?.invoiceNumber ||
        `INV-${new Date(o.createdAt).getFullYear()}-${o.orderNumber.replace(/[^0-9]/g, "").slice(-4) || o.id.slice(-4)}`;

      const items = (o.items || []).map((i: any) => ({
        title: i.productVariant?.product?.name || i.title || "Store Item",
        sku: i.productVariant?.sku || i.sku || "SKU",
        unitBarcode: i.unitBarcode?.barcode,
        quantity: i.quantity || 1,
        unitPrice: i.unitPrice || o.totalAmount / (i.quantity || 1),
        total: i.totalPrice || (i.unitPrice || 0) * (i.quantity || 1) || o.totalAmount,
        hsn: i.productVariant?.product?.hsn || "8525",
      }));

      const resolvedItems =
        items.length > 0
          ? items
          : [
              {
                title: o.channel === "POS" ? "POS Retail Counter Sale" : "Standard Store Order",
                sku: `SKU-${o.orderNumber.replace(/[^a-zA-Z0-9]/g, "") || "PROD"}`,
                quantity: 1,
                unitPrice: o.totalAmount,
                total: o.totalAmount,
                hsn: "8525",
              },
            ];

      const taxable = o.totalAmount / 1.18;
      const gst = o.totalAmount - taxable;

      list.push({
        id: o.id,
        invoiceNumber,
        orderNumber: o.orderNumber,
        orderDbId: o.id,
        channel: (o.channel as any) || "WEBSITE",
        customerName: o.customer?.name || o.customerName || "Customer",
        customerPhone: o.customer?.phone || o.customerPhone,
        customerEmail: o.customer?.email || o.customerEmail,
        shippingAddress: o.shippingAddress || "Store Pickup / Counter Dispatch",
        city: o.city || o.customer?.city,
        state: o.state || o.customer?.state,
        pincode: o.pincode || o.customer?.pincode,
        totalAmount: o.totalAmount,
        subtotal: taxable,
        cgst: gst / 2,
        sgst: gst / 2,
        status: o.status || "Completed",
        createdAt: o.createdAt,
        trackingNumber: o.trackingNumber,
        courier: o.courier || (o.channel === "POS" ? "Handheld / Direct Counter" : "Standard Express"),
        paymentMethod: o.paymentMethod || "PREPAID",
        items: resolvedItems,
      });
    });

    // 2. Marketplace Orders (Amazon / Flipkart)
    marketplaceOrders.forEach((m) => {
      const channel = m.channel === "AMAZON" ? "AMAZON" : "FLIPKART";
      const invoiceNumber = `INV-${channel === "AMAZON" ? "AZ" : "FK"}-${m.channelOrderId.replace(/[^0-9]/g, "").slice(-4) || m.id.slice(-4)}`;

      const items = (m.items || []).map((i: any) => ({
        title: i.title || `${channel} Product Item`,
        sku: i.sku || "SKU",
        asinOrFsn: i.asinOrFsn,
        quantity: i.quantity || 1,
        unitPrice: i.price || m.totalAmount / (i.quantity || 1),
        total: (i.price || 0) * (i.quantity || 1) || m.totalAmount,
        hsn: "8525",
      }));

      const resolvedItems =
        items.length > 0
          ? items
          : [
              {
                title: `${channel} Marketplace Order`,
                sku: `SKU-${m.channelOrderId.replace(/[^a-zA-Z0-9]/g, "")}`,
                quantity: 1,
                unitPrice: m.totalAmount,
                total: m.totalAmount,
                hsn: "8525",
              },
            ];

      const taxable = m.totalAmount / 1.18;
      const gst = m.totalAmount - taxable;

      list.push({
        id: m.id,
        invoiceNumber,
        orderNumber: m.channelOrderId,
        orderDbId: m.id,
        channel,
        customerName: m.buyerName || `${channel} Customer`,
        shippingAddress: m.shippingAddress || `${channel} Fulfillment Network`,
        city: m.buyerCity,
        state: m.buyerState,
        pincode: m.buyerPincode,
        totalAmount: m.totalAmount,
        subtotal: taxable,
        cgst: gst / 2,
        sgst: gst / 2,
        status: m.orderStatus || "UNSHIPPED",
        createdAt: m.orderDate,
        trackingNumber: m.trackingNumber,
        courier: m.courier || (channel === "AMAZON" ? "Amazon ATS Express" : "Ekart Logistics"),
        paymentMethod: "PREPAID",
        items: resolvedItems,
      });
    });

    return list;
  }, [orders, marketplaceOrders, invoices]);

  // Perform search / scan lookup
  const handleSearch = (term: string) => {
    const clean = term.trim().toLowerCase();
    if (!clean) return;

    const cleanAlphaNum = clean.replace(/[^a-z0-9]/g, "");

    // Find match by Invoice #, Order #, AWB Tracking #, Customer Name, Phone, Item SKU, or Item Unit Barcode
    const match = unifiedInvoices.find((inv) => {
      const invClean = inv.invoiceNumber.toLowerCase();
      const invAlpha = invClean.replace(/[^a-z0-9]/g, "");
      if (invClean === clean || invAlpha === cleanAlphaNum || invClean.includes(clean)) return true;

      const orderClean = inv.orderNumber.toLowerCase();
      const orderAlpha = orderClean.replace(/[^a-z0-9]/g, "");
      if (orderClean === clean || orderAlpha === cleanAlphaNum || orderClean.includes(clean)) return true;

      if (inv.trackingNumber) {
        const trkClean = inv.trackingNumber.toLowerCase();
        const trkAlpha = trkClean.replace(/[^a-z0-9]/g, "");
        if (trkClean === clean || trkAlpha === cleanAlphaNum || trkClean.includes(clean)) return true;
      }

      if (inv.customerPhone) {
        const phoneAlpha = inv.customerPhone.replace(/[^0-9]/g, "");
        if (phoneAlpha && (phoneAlpha.includes(cleanAlphaNum) || cleanAlphaNum.includes(phoneAlpha))) return true;
      }

      if (inv.customerName.toLowerCase().includes(clean)) return true;

      if (
        inv.items.some((i) => {
          const skuClean = i.sku.toLowerCase();
          const skuAlpha = skuClean.replace(/[^a-z0-9]/g, "");
          if (skuClean.includes(clean) || (cleanAlphaNum.length >= 3 && skuAlpha.includes(cleanAlphaNum))) return true;
          if (i.unitBarcode) {
            const bcClean = i.unitBarcode.toLowerCase();
            const bcAlpha = bcClean.replace(/[^a-z0-9]/g, "");
            if (bcClean === clean || bcAlpha === cleanAlphaNum || bcClean.includes(clean)) return true;
          }
          return false;
        })
      ) {
        return true;
      }

      return false;
    });

    if (match) {
      setSelectedInvoice(match);
      // Play positive audio beep if browser allows
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      } catch {}
    } else {
      // Play low negative beep
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(250, audioCtx.currentTime);
        osc.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      } catch {}
    }
  };

  // Handle Form Submit from input (e.g. handheld scanner Enter key)
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      handleSearch(searchInput);
    }
  };

  // Filtered List for the Recent Invoices Table
  const filteredInvoices = useMemo(() => {
    return unifiedInvoices.filter((inv) => {
      if (channelFilter !== "ALL" && inv.channel !== channelFilter) return false;
      if (!searchInput.trim()) return true;
      const clean = searchInput.trim().toLowerCase();
      const cleanAlphaNum = clean.replace(/[^a-z0-9]/g, "");

      const invClean = inv.invoiceNumber.toLowerCase();
      const invAlpha = invClean.replace(/[^a-z0-9]/g, "");
      if (invClean.includes(clean) || (cleanAlphaNum.length >= 3 && invAlpha.includes(cleanAlphaNum))) return true;

      const orderClean = inv.orderNumber.toLowerCase();
      const orderAlpha = orderClean.replace(/[^a-z0-9]/g, "");
      if (orderClean.includes(clean) || (cleanAlphaNum.length >= 3 && orderAlpha.includes(cleanAlphaNum))) return true;

      if (inv.trackingNumber) {
        const trkClean = inv.trackingNumber.toLowerCase();
        const trkAlpha = trkClean.replace(/[^a-z0-9]/g, "");
        if (trkClean.includes(clean) || (cleanAlphaNum.length >= 3 && trkAlpha.includes(cleanAlphaNum))) return true;
      }

      if (inv.customerPhone) {
        const phoneAlpha = inv.customerPhone.replace(/[^0-9]/g, "");
        if (phoneAlpha && (phoneAlpha.includes(cleanAlphaNum) || cleanAlphaNum.includes(phoneAlpha))) return true;
      }

      if (inv.customerName.toLowerCase().includes(clean)) return true;

      if (
        inv.items.some((i) => {
          const skuClean = i.sku.toLowerCase();
          const skuAlpha = skuClean.replace(/[^a-z0-9]/g, "");
          if (skuClean.includes(clean) || (cleanAlphaNum.length >= 3 && skuAlpha.includes(cleanAlphaNum))) return true;
          if (i.unitBarcode) {
            const bcClean = i.unitBarcode.toLowerCase();
            const bcAlpha = bcClean.replace(/[^a-z0-9]/g, "");
            if (bcClean.includes(clean) || (cleanAlphaNum.length >= 3 && bcAlpha.includes(cleanAlphaNum))) return true;
          }
          return false;
        })
      ) {
        return true;
      }

      return false;
    });
  }, [unifiedInvoices, channelFilter, searchInput]);

  // Open Invoice Print Dialog
  const handleOpenPrintDialog = (
    inv: UnifiedInvoiceItem,
    mode: "A4_INVOICE" | "THERMAL_LABEL" = "A4_INVOICE"
  ) => {
    setInvoiceModalMode(mode);
    setShippingInvoiceData({
      orderId: inv.orderNumber,
      orderDbId: inv.orderDbId,
      isSavedInDb: true,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.createdAt,
      channel: inv.channel,
      orderDate: inv.createdAt,
      buyerName: inv.customerName,
      buyerEmail: inv.customerEmail,
      buyerPhone: inv.customerPhone,
      shippingAddress: inv.shippingAddress || "Direct Dispatch",
      city: inv.city,
      state: inv.state,
      pincode: inv.pincode,
      trackingNumber:
        inv.trackingNumber ||
        `AWB-${inv.orderNumber.replace(/[^0-9]/g, "").slice(-8) || "89230192"}`,
      courier:
        inv.courier ||
        (inv.channel === "AMAZON"
          ? "Amazon ATS Express"
          : inv.channel === "FLIPKART"
          ? "Ekart Logistics"
          : "Standard Logistics"),
      totalAmount: inv.totalAmount,
      items: inv.items.map((i) => ({
        title: i.title,
        sku: i.sku,
        asinOrFsn: i.asinOrFsn,
        unitBarcode: i.unitBarcode,
        hsn: i.hsn || "8525",
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.total,
      })),
    });
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  return (
    <div className="space-y-6 py-2">
      {/* Page Title & Scanner Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#cce7ed] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0b252c] flex items-center gap-2.5">
            <ScanBarcode className="w-6 h-6 text-[#056468]" />
            <span>Invoice Barcode Search & Scan Hub</span>
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Scan physical invoice barcodes, AWB tracking tags, or search by Order ID / Customer name for instant verification and 1-click ERP printing.
          </p>
        </div>

        {/* Channel Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setChannelFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
              channelFilter === "ALL"
                ? "bg-[#056468] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Channels ({unifiedInvoices.length})
          </button>
          <button
            onClick={() => setChannelFilter("WEBSITE")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
              channelFilter === "WEBSITE"
                ? "bg-emerald-700 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Globe className="w-3 h-3" />
            <span>Website</span>
          </button>
          <button
            onClick={() => setChannelFilter("AMAZON")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
              channelFilter === "AMAZON"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Amazon</span>
          </button>
          <button
            onClick={() => setChannelFilter("FLIPKART")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
              channelFilter === "FLIPKART"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Flipkart</span>
          </button>
          <button
            onClick={() => setChannelFilter("POS")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
              channelFilter === "POS"
                ? "bg-purple-700 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Store className="w-3 h-3" />
            <span>POS</span>
          </button>
        </div>
      </div>

      {/* SEARCH / BARCODE SCANNER INPUT BOX */}
      <div className="bg-gradient-to-r from-teal-50 via-white to-slate-50 border-2 border-[#056468]/30 rounded-2xl p-4 sm:p-6 shadow-sm">
        <form onSubmit={handleFormSubmit} className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase text-[#056468] tracking-wider flex items-center gap-2">
              <ScanBarcode className="w-4 h-4 text-[#056468]" />
              <span>Scan Barcode or Search Invoice Details:</span>
            </label>
            <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline-block">
              Supports Handheld USB Laser Guns • Wireless Barcode Scanners • Manual Search
            </span>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  if (e.target.value.length >= 3) {
                    handleSearch(e.target.value);
                  }
                }}
                placeholder="Scan Invoice Barcode, AWB No., Order # (e.g. INV-2026-0001, 54082, OD123456...)"
                className="w-full pl-11 pr-10 py-3 bg-white border-2 border-slate-300 focus:border-[#056468] focus:ring-4 focus:ring-[#056468]/15 rounded-xl font-mono text-sm sm:text-base font-bold text-slate-900 placeholder:text-slate-400 shadow-inner transition-all outline-none"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    setSelectedInvoice(null);
                    inputRef.current?.focus();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="submit"
              className="px-5 py-3 bg-[#056468] hover:bg-[#044e51] text-white font-bold text-sm rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer shrink-0"
            >
              <ScanBarcode className="w-4 h-4" />
              <span>Scan / Find</span>
            </button>
          </div>
        </form>
      </div>

      {/* INSTANT INVOICE DETAILS POPUP MODAL (DISPLAYED WHEN SCANNED / CLICKED) */}
      {selectedInvoice && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setSelectedInvoice(null)}
        >
          <div
            className="bg-white border-2 border-[#056468] rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 relative my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Banner Header */}
            <div className="bg-gradient-to-r from-[#056468] to-[#0b252c] text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-md">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2.5 bg-white/10 rounded-xl border border-white/20 shrink-0">
                  <Receipt className="w-6 h-6 text-emerald-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg sm:text-xl font-black tracking-tight font-mono">
                      {selectedInvoice.invoiceNumber}
                    </h3>
                    <span className="px-2 py-0.5 bg-emerald-400 text-emerald-950 font-black text-[10px] rounded uppercase tracking-wider">
                      {selectedInvoice.status}
                    </span>
                    <span className="px-2 py-0.5 bg-white/20 text-white font-bold text-[10px] rounded uppercase">
                      {selectedInvoice.channel}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-100/90 mt-0.5">
                    Order Ref: <strong className="font-mono text-white">#{selectedInvoice.orderNumber}</strong> • Issued on:{" "}
                    {new Date(selectedInvoice.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Quick Action Print Buttons & Close */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleOpenPrintDialog(selectedInvoice, "A4_INVOICE")}
                  className="px-3.5 py-2 bg-emerald-400 hover:bg-emerald-300 text-[#044e51] font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print A4 GST Invoice</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenPrintDialog(selectedInvoice, "THERMAL_LABEL")}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>100×150mm Label</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                  title="Close popup (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Details Body Grid (Scrollable) */}
            <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Box 1: Buyer & Customer Details */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs shadow-2xs">
                  <div className="text-[10px] font-black uppercase text-[#056468] tracking-wider border-b border-slate-200 pb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#056468]" />
                      <span>Consignee & Buyer Info</span>
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedInvoice.customerName, "buyer")}
                      className="text-slate-400 hover:text-[#056468] transition-colors"
                      title="Copy Name"
                    >
                      {copiedField === "buyer" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-slate-900">{selectedInvoice.customerName}</div>
                    <div className="text-slate-600 mt-0.5 leading-snug">{selectedInvoice.shippingAddress}</div>
                    <div className="text-slate-700 font-semibold mt-1">
                      PIN: <span className="font-mono font-bold text-[#056468]">{selectedInvoice.pincode || "400001"}</span> •{" "}
                      {selectedInvoice.state || "Maharashtra (27)"}
                    </div>
                    {selectedInvoice.customerPhone && (
                      <div className="text-slate-600 font-medium mt-1 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{selectedInvoice.customerPhone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Box 2: Courier & Shipping Logistics */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs shadow-2xs">
                  <div className="text-[10px] font-black uppercase text-[#056468] tracking-wider border-b border-slate-200 pb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-[#056468]" />
                      <span>Dispatch & Logistics</span>
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedInvoice.trackingNumber || selectedInvoice.orderNumber, "awb")}
                      className="text-slate-400 hover:text-[#056468] transition-colors"
                      title="Copy AWB"
                    >
                      {copiedField === "awb" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Carrier:</span>
                      <strong className="text-slate-900 font-bold">{selectedInvoice.courier}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">AWB Tracking:</span>
                      <strong className="font-mono text-slate-900 bg-white px-1.5 py-0.5 border border-slate-200 rounded text-[11px]">
                        {selectedInvoice.trackingNumber || `AWB-${selectedInvoice.orderNumber.replace(/[^0-9]/g, "").slice(-8) || "89230192"}`}
                      </strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Payment Mode:</span>
                      <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300">
                        {selectedInvoice.paymentMethod || "PREPAID"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Channel Source:</span>
                      <strong className="text-[#056468]">{selectedInvoice.channel} DIRECT</strong>
                    </div>
                  </div>
                </div>

                {/* Box 3: Financial Settlement & GST Breakdown */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs shadow-2xs">
                  <div className="text-[10px] font-black uppercase text-[#056468] tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-[#056468]" />
                    <span>Invoice Financial Settlement</span>
                  </div>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between text-slate-600">
                      <span>Taxable Subtotal:</span>
                      <span>₹{selectedInvoice.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>CGST (9%):</span>
                      <span>₹{selectedInvoice.cgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SGST (9%):</span>
                      <span>₹{selectedInvoice.sgst.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-slate-300 pt-1 flex justify-between items-center font-bold text-slate-900">
                      <span>Grand Total:</span>
                      <span className="text-base text-[#056468] font-black">
                        ₹{selectedInvoice.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ORDER ITEMS TABLE */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-100 px-4 py-2 text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>Products In This Invoice ({selectedInvoice.items.length} Item{selectedInvoice.items.length > 1 ? "s" : ""})</span>
                  <span className="font-mono text-slate-500 font-semibold">Total Qty: {selectedInvoice.items.reduce((a, b) => a + b.quantity, 0)}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="p-2.5 text-center w-8">#</th>
                        <th className="p-2.5">Item & SKU</th>
                        <th className="p-2.5 text-center">HSN</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Rate (₹)</th>
                        <th className="p-2.5 text-right">Taxable</th>
                        <th className="p-2.5 text-right">GST (18%)</th>
                        <th className="p-2.5 text-right font-black">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedInvoice.items.map((itm, i) => {
                        const itmTaxable = itm.total / 1.18;
                        const itmGst = itm.total - itmTaxable;
                        return (
                          <tr key={i} className="hover:bg-slate-50/80">
                            <td className="p-2.5 text-center font-bold text-slate-500">{i + 1}</td>
                            <td className="p-2.5">
                              <div className="font-bold text-slate-900">{itm.title}</div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                SKU: <strong className="text-slate-700">{itm.sku}</strong>
                                {itm.unitBarcode && <span> • Barcode: {itm.unitBarcode}</span>}
                              </div>
                            </td>
                            <td className="p-2.5 text-center font-mono">{itm.hsn || "8525"}</td>
                            <td className="p-2.5 text-center font-black">{itm.quantity}</td>
                            <td className="p-2.5 text-right font-mono">₹{(itm.unitPrice / 1.18).toFixed(2)}</td>
                            <td className="p-2.5 text-right font-mono">₹{itmTaxable.toFixed(2)}</td>
                            <td className="p-2.5 text-right font-mono text-slate-600">₹{itmGst.toFixed(2)}</td>
                            <td className="p-2.5 text-right font-mono font-black text-[#056468]">₹{itm.total.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECENT INVOICES DIRECTORY TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#056468]" />
              <span>All Generated & Sync Invoices ({filteredInvoices.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any invoice row to instantly load full details and launch ERP print.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f0f8fa] text-[#0b252c] font-bold uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-3 w-10 text-center">#</th>
                <th className="p-3">Invoice Number</th>
                <th className="p-3">Order Ref</th>
                <th className="p-3">Channel</th>
                <th className="p-3">Buyer / Consignee</th>
                <th className="p-3">AWB / Courier</th>
                <th className="p-3 text-right">Grand Total</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Date</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-semibold text-slate-600">No invoices match your search or filter.</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try scanning another barcode or clearing search keywords.</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv, idx) => (
                  <tr
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className={`cursor-pointer transition-colors ${
                      selectedInvoice?.id === inv.id
                        ? "bg-teal-50/80 font-medium"
                        : "hover:bg-slate-50/80"
                    }`}
                  >
                    <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                    <td className="p-3">
                      <span className="font-mono font-bold text-[#056468] hover:underline">
                        {inv.invoiceNumber}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-semibold text-slate-800">
                      #{inv.orderNumber}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase ${
                          inv.channel === "AMAZON"
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : inv.channel === "FLIPKART"
                            ? "bg-blue-100 text-blue-900 border border-blue-300"
                            : inv.channel === "POS"
                            ? "bg-purple-100 text-purple-900 border border-purple-300"
                            : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                        }`}
                      >
                        {inv.channel}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{inv.customerName}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                        {inv.city ? `${inv.city}, ` : ""}{inv.state || "India"}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-slate-800">{inv.courier}</div>
                      <div className="text-[10px] font-mono text-slate-500">{inv.trackingNumber || "—"}</div>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-950">
                      ₹{inv.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-3 text-center text-slate-500 font-mono text-[11px]">
                      {new Date(inv.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInvoice(inv);
                            handleOpenPrintDialog(inv, "A4_INVOICE");
                          }}
                          className="p-1.5 text-[#056468] hover:bg-[#e3f2f5] rounded-lg transition-colors cursor-pointer"
                          title="Print A4 GST Invoice"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInvoice(inv);
                            handleOpenPrintDialog(inv, "THERMAL_LABEL");
                          }}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Print Shipping Label"
                        >
                          <Package className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Shipping & Invoice Dialog Modal */}
      {shippingInvoiceData && (
        <PrintShippingInvoiceDialog
          isOpen={Boolean(shippingInvoiceData)}
          onClose={() => setShippingInvoiceData(null)}
          data={shippingInvoiceData}
          initialMode={invoiceModalMode}
          companySettings={companySettings}
        />
      )}
    </div>
  );
}
