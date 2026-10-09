"use client";

import { useState, useRef, useEffect } from "react";
import { BarcodeSvg } from "@/components/BarcodeSvg";
import {
  ScanBarcode,
  ShoppingCart,
  Zap,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  Receipt,
  Printer,
  CreditCard,
  QrCode,
  Banknote,
  FileText,
  Store,
  Globe,
  Truck,
  Building2,
  PackageCheck,
  Tag,
  Hash,
  ShieldCheck,
} from "lucide-react";
import {
  PrintShippingInvoiceDialog,
  ShippingInvoiceData,
} from "@/components/PrintShippingInvoiceDialog";

export default function ScanPosPage() {
  const [scanInput, setScanInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastLookup, setLastLookup] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [cart, setCart] = useState<any[]>([]);
  const [scanPromptNotice, setScanPromptNotice] = useState<{
    type: "ALREADY_IN_CART";
    unitBarcode: string;
    productName: string;
    serialNumber: number;
    index: number;
  } | null>(null);

  // Channel / Order Source
  const [orderSource, setOrderSource] = useState<
    "POS" | "AMAZON" | "FLIPKART" | "WEBSITE" | "SHOPIFY" | "B2B"
  >("POS");

  const [channelOrderId, setChannelOrderId] = useState("");
  const [customerName, setCustomerName] = useState("Walk-in Retail Customer");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [courierName, setCourierName] = useState("");
  const [trackingNo, setTrackingNo] = useState("");

  // Payment Status: PAID vs COD / UNPAID
  const [paymentStatus, setPaymentStatus] = useState<"PAID" | "COD / UNPAID">("PAID");

  // Payment Mode
  const [paymentMethod, setPaymentMethod] = useState<
    "CASH" | "UPI / QR CODE" | "CARD (DEBIT/CREDIT)" | "PREPAID" | "NET BANKING" | "COD" | "CREDIT"
  >("CASH");

  const [checkoutSuccess, setCheckoutSuccess] = useState<any>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Invoice dialog state
  const [invoiceModalData, setInvoiceModalData] = useState<ShippingInvoiceData | null>(null);
  const [invoiceModalMode, setInvoiceModalMode] = useState<"A4_INVOICE" | "THERMAL_LABEL">("A4_INVOICE");

  const inputRef = useRef<HTMLInputElement>(null);

  // Keep focus on input for USB hardware scanner
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Sync defaults when channel changes
  const handleChannelChange = (channel: "POS" | "AMAZON" | "FLIPKART" | "WEBSITE" | "SHOPIFY" | "B2B") => {
    setOrderSource(channel);
    if (channel === "POS") {
      setCustomerName("Walk-in Retail Customer");
      setPaymentStatus("PAID");
      setPaymentMethod("CASH");
      setCourierName("");
      setTrackingNo("");
    } else if (channel === "AMAZON") {
      setCustomerName("Amazon Customer");
      setPaymentStatus("PAID");
      setPaymentMethod("PREPAID");
      setCourierName("Amazon ATS Express");
    } else if (channel === "FLIPKART") {
      setCustomerName("Flipkart Buyer");
      setPaymentStatus("PAID");
      setPaymentMethod("PREPAID");
      setCourierName("Ekart Logistics");
    } else if (channel === "WEBSITE" || channel === "SHOPIFY") {
      setCustomerName("Website Online Buyer");
      setPaymentStatus("PAID");
      setPaymentMethod("PREPAID");
      setCourierName("BlueDart / Delhivery");
    } else if (channel === "B2B") {
      setCustomerName("B2B Corporate Client");
      setPaymentStatus("COD / UNPAID");
      setPaymentMethod("NET BANKING");
      setCourierName("Transport / Surface");
    }
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    setLoading(true);
    setError(null);
    setCheckoutSuccess(null);

    try {
      const res = await fetch(
        `/api/barcodes/lookup?q=${encodeURIComponent(scanInput.trim())}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Item not found");
      }

      setLastLookup(data);

      // Check if already in cart
      if (data.unitBarcode) {
        const existsIndex = cart.findIndex((c) => c.unitBarcode === data.unitBarcode);
        if (existsIndex !== -1) {
          setError(null);
          // Set a friendly prompt notice
          setScanPromptNotice({
            type: "ALREADY_IN_CART",
            unitBarcode: data.unitBarcode,
            productName: data.productName,
            serialNumber: data.serialNumber,
            index: existsIndex,
          });
        } else {
          setScanPromptNotice(null);
          setCart((prev) => [
            ...prev,
            {
              unitBarcode: data.unitBarcode,
              serialNumber: data.serialNumber,
              sku: data.sku,
              productName: data.productName,
              price: data.price,
              unitStatus: data.unitStatus,
            },
          ]);
        }
      }

      setScanInput("");
    } catch (err: any) {
      setError(err.message);
      setScanPromptNotice(null);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
    if (scanPromptNotice && scanPromptNotice.index === index) {
      setScanPromptNotice(null);
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price || 0), 0);

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;

    setCheckoutLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/scan/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          channel: orderSource,
          channelOrderId: channelOrderId.trim() || undefined,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim() || undefined,
          shippingAddress: shippingAddress.trim() || undefined,
          paymentStatus,
          paymentMethod,
          courier: courierName.trim() || undefined,
          trackingNumber: trackingNo.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Checkout failed");
      }

      setCheckoutSuccess(data);
      setCart([]);
      setLastLookup(null);
      setChannelOrderId("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleOpenInvoiceModal = (mode: "A4_INVOICE" | "THERMAL_LABEL") => {
    if (!checkoutSuccess) return;

    setInvoiceModalMode(mode);
    setInvoiceModalData({
      orderId: checkoutSuccess.orderNumber || "ORD-POS",
      orderDbId: checkoutSuccess.orderId,
      channel: checkoutSuccess.channel || orderSource,
      orderDate: checkoutSuccess.createdAt || new Date(),
      buyerName: checkoutSuccess.customerName || customerName,
      shippingAddress: checkoutSuccess.shippingAddress || "Local Counter Pickup / Direct Sale",
      paymentMethod: paymentMethod as any,
      totalAmount: checkoutSuccess.totalAmount || cartTotal,
      items: (checkoutSuccess.processedItems || []).map((p: any) => ({
        title: p.name || p.sku || "Inventory Product",
        sku: p.sku,
        unitBarcode: p.unitBarcode,
        hsn: "8525",
        quantity: 1,
        unitPrice: p.price,
        total: p.price,
      })),
    });
  };

  return (
    <div className="space-y-6 py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#cce7ed] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0b252c] flex items-center gap-2.5">
            <ScanBarcode className="w-6 h-6 text-[#056468]" />
            <span>Quick Scan POS & Multi-Channel Dispatch</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Scan physical Code 128 unit barcodes for Amazon, Flipkart, Website, Walk-in POS, or B2B orders with automatic stock deduction and invoice generation.
          </p>
        </div>
      </div>

      {/* Main Grid: Scanner Left, Cart Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Barcode Scanner Input & Lookup Card */}
        <div className="lg:col-span-7 space-y-5">
          {/* Scan Barcode Form */}
          <form onSubmit={handleScanSubmit} className="bg-white border border-[#cce7ed] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-[#056468] uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4" />
                Hardware Barcode Scanner Input
              </label>
              <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Scanner Ready (Auto-Focus)
              </span>
            </div>

            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Scan or type unit barcode (e.g. 299420114239)..."
                className="flex-1 bg-slate-50 border-2 border-[#056468]/60 rounded-xl px-4 py-3 text-lg font-mono font-bold text-[#0b252c] placeholder-slate-400 focus:outline-none focus:border-[#056468]"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-[#056468] hover:bg-[#044e51] text-white font-bold text-sm rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <ScanBarcode className="w-4 h-4" />
                {loading ? "Scanning..." : "Scan Item"}
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              Point your USB / Wireless scanner at the physical label sticker to scan and verify.
            </p>
          </form>

          {/* Smart Tooltip for Already Scanned Items */}
          {scanPromptNotice && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 shadow-sm animate-in fade-in space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 shrink-0 mt-0.5">
                    <AlertCircle className="w-4 h-4 text-amber-700" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-950">
                      Unit Barcode Already Scanned in Dispatch Cart
                    </h4>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      <strong>{scanPromptNotice.productName}</strong> (Unit #{scanPromptNotice.serialNumber}) • Barcode: <span className="font-mono font-bold">{scanPromptNotice.unitBarcode}</span>
                    </p>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Would you like to complete and register this order, or remove this item from the cart?
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setScanPromptNotice(null)}
                  className="text-amber-600 hover:text-amber-800 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("customer-name-input");
                    if (el) el.focus();
                  }}
                  className="px-3.5 py-1.5 bg-[#056468] hover:bg-[#044e51] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Fill Order Details & Complete</span>
                </button>

                <button
                  type="button"
                  onClick={() => removeFromCart(scanPromptNotice.index)}
                  className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove from Cart</span>
                </button>
              </div>
            </div>
          )}

          {/* Feedback alerts */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                {error}
              </span>
              <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Checkout Success Banner */}
          {checkoutSuccess && (
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 shadow-sm animate-in fade-in space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                      <span>Dispatch Completed! (#{checkoutSuccess.orderNumber})</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 font-bold uppercase text-emerald-900">
                        {checkoutSuccess.channel}
                      </span>
                    </h3>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Total: <strong>₹{(checkoutSuccess.totalAmount || 0).toFixed(2)}</strong> • Status: <strong className="uppercase bg-emerald-200/80 px-1.5 py-0.5 rounded text-emerald-950">{checkoutSuccess.paymentStatus} ({checkoutSuccess.paymentMethod})</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <button
                    type="button"
                    onClick={() => handleOpenInvoiceModal("A4_INVOICE")}
                    className="px-4 py-2 bg-[#056468] hover:bg-[#044e51] text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View & Print Tax Invoice</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenInvoiceModal("THERMAL_LABEL")}
                    className="px-3.5 py-2 bg-white border border-[#056468] hover:bg-[#f0f8fa] text-[#056468] font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Shipping Label</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Last Scanned Unit Inspection */}
          {lastLookup && (
            <div className="bg-white border border-[#cce7ed] rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center justify-between">
                <span>Last Scanned Unit Details</span>
                <span className="font-mono text-[#056468] font-bold">{lastLookup.unitBarcode}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] text-slate-500">Product Name</span>
                  <div className="font-semibold text-[#0b252c] text-base">{lastLookup.productName}</div>
                  <div className="text-xs text-slate-500 font-mono">SKU: {lastLookup.sku}</div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500">Serial Unit</span>
                  <div className="font-semibold text-[#056468] text-sm">
                    Unit #{lastLookup.serialNumber || 1}
                  </div>
                  <div className="text-xs font-bold text-emerald-700">₹{(lastLookup.price || 0).toFixed(2)}</div>
                </div>
              </div>

              <div className="bg-[#f2f9fa] p-3 rounded-xl border border-[#cce7ed] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-medium">Unit Verification Status:</span>
                  <div className="mt-0.5">
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                        lastLookup.unitStatus === "AVAILABLE"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {lastLookup.unitStatus}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Added to Cart</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Multi-Channel Order Config & POS Cart */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-[#cce7ed] rounded-2xl p-6 shadow-sm space-y-5 flex flex-col justify-between min-h-[550px]">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-[#0b252c] flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-[#056468]" />
                  <span>Order & Dispatch Channel</span>
                </h2>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                  >
                    Clear Cart ({cart.length})
                  </button>
                )}
              </div>

              {/* 1. ORDER SOURCE DROPDOWN */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Select Sales / Dispatch Channel:</span>
                  <span className="text-[10px] text-[#056468] font-semibold uppercase">{orderSource} MODE</span>
                </label>
                <select
                  value={orderSource}
                  onChange={(e) => handleChannelChange(e.target.value as any)}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#056468] bg-white cursor-pointer"
                >
                  <option value="POS">🏬 Walk-in Customer (In-Store Retail Counter)</option>
                  <option value="AMAZON">📦 Amazon India (SP-API Dispatch)</option>
                  <option value="FLIPKART">🛍️ Flipkart (Marketplace Dispatch)</option>
                  <option value="WEBSITE">🌐 Online Website (Direct E-Commerce Store)</option>
                  <option value="SHOPIFY">🛒 Shopify Online Store</option>
                  <option value="B2B">🏢 B2B / Wholesale Corporate Order</option>
                </select>
              </div>

              {/* 2. ORDER / CUSTOMER INFO */}
              <div className="space-y-2.5 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {orderSource === "POS" ? "Customer Name" : `${orderSource} Buyer Name`}
                    </label>
                    <input
                      id="customer-name-input"
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-[#056468]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {orderSource === "POS" ? "Order Ref / Receipt #" : `${orderSource} Order ID`}
                    </label>
                    <input
                      type="text"
                      value={channelOrderId}
                      onChange={(e) => setChannelOrderId(e.target.value)}
                      placeholder={
                        orderSource === "AMAZON"
                          ? "e.g. 402-9842184-1849102"
                          : orderSource === "FLIPKART"
                          ? "e.g. OD482910398214"
                          : orderSource === "WEBSITE"
                          ? "e.g. WEB-1029"
                          : "Auto-generated (e.g. POS-2026-0001)"
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-[#056468] focus:outline-none focus:border-[#056468]"
                    />
                  </div>
                </div>

                {/* Customer Phone & Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Customer Phone (WhatsApp / SMS Bill)
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+91 98200 12345 (Optional)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono focus:outline-none focus:border-[#056468]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Delivery Address / Counter Details
                    </label>
                    <input
                      type="text"
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder={
                        orderSource === "POS"
                          ? "In-Store Counter Pickup / Mumbai"
                          : "Delivery Address, Pincode"
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-[#056468]"
                    />
                  </div>
                </div>
              </div>

              {/* Cart Items List */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Scanned Items in Cart ({cart.length})
                </label>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {cart.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      Scan barcodes to add items to this dispatch.
                    </div>
                  ) : (
                    cart.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-[#f2f9fa] border border-[#cce7ed] rounded-xl p-2.5 flex items-center justify-between text-xs space-x-2"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-[#0b252c] truncate">{item.productName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {item.unitBarcode} <span className="text-[#056468]">(Unit #{item.serialNumber})</span>
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-2">
                          <span className="font-bold text-emerald-700 font-mono">
                            ₹{(item.price || 0).toFixed(2)}
                          </span>
                          <button
                            onClick={() => removeFromCart(idx)}
                            className="p-1 text-rose-500 hover:text-rose-700 rounded"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 3. PAYMENT STATUS & MODE */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-[#056468]" />
                    <span>Payment Status:</span>
                  </label>

                  {/* Toggle: PAID vs COD / UNPAID */}
                  <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs">
                    <button
                      type="button"
                      onClick={() => setPaymentStatus("PAID")}
                      className={`px-3 py-1 rounded-md font-bold transition-all ${
                        paymentStatus === "PAID"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      🟢 PAID (Prepaid)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentStatus("COD / UNPAID");
                        setPaymentMethod("COD");
                      }}
                      className={`px-3 py-1 rounded-md font-bold transition-all ${
                        paymentStatus === "COD / UNPAID"
                          ? "bg-amber-500 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      🟠 COD / UNPAID
                    </button>
                  </div>
                </div>

                {/* Payment Method Selector Grid */}
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {[
                    { id: "CASH", label: "Cash", icon: Banknote },
                    { id: "UPI / QR CODE", label: "UPI / QR", icon: QrCode },
                    { id: "CARD (DEBIT/CREDIT)", label: "Card", icon: CreditCard },
                    { id: "PREPAID", label: "Prepaid", icon: Zap },
                    { id: "NET BANKING", label: "NetBanking", icon: Receipt },
                    { id: "COD", label: "COD", icon: ShoppingCart },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = paymentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as any)}
                        className={`p-2 rounded-xl border text-center font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          isSelected
                            ? "bg-[#056468] text-white border-[#056468] shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-[10px]">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Total & Complete Sale Button */}
            <div className="border-t border-slate-100 pt-3 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-semibold text-slate-700 block">Total Amount:</span>
                  <span className="text-[11px] text-slate-500">
                    Channel: <strong className="text-slate-800">{orderSource}</strong> •{" "}
                    <strong className={paymentStatus === "PAID" ? "text-emerald-700" : "text-amber-700"}>
                      {paymentStatus}
                    </strong>
                  </span>
                </div>
                <span className="font-bold text-2xl text-emerald-700 font-mono">
                  ₹{cartTotal.toFixed(2)}
                </span>
              </div>

              <button
                onClick={handleCompleteSale}
                disabled={cart.length === 0 || checkoutLoading}
                className="w-full py-3 rounded-xl bg-[#056468] hover:bg-[#044e51] text-white font-bold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Zap className="w-4 h-4" />
                <span>
                  {checkoutLoading
                    ? "Processing Dispatch..."
                    : `Complete ${orderSource} Dispatch (${paymentStatus} - ${paymentMethod})`}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice & Label Dialog */}
      {invoiceModalData && (
        <PrintShippingInvoiceDialog
          isOpen={!!invoiceModalData}
          onClose={() => setInvoiceModalData(null)}
          data={invoiceModalData}
          initialMode={invoiceModalMode}
        />
      )}
    </div>
  );
}
