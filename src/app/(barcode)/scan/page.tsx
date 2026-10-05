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
  const [customerName, setCustomerName] = useState("Walk-in Retail Customer");
  const [paymentMethod, setPaymentMethod] = useState<
    "CASH" | "UPI / QR CODE" | "CARD (DEBIT/CREDIT)" | "PREPAID" | "NET BANKING" | "COD"
  >("CASH");
  const [checkoutSuccess, setCheckoutSuccess] = useState<any>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Invoice dialog state
  const [invoiceModalData, setInvoiceModalData] =
    useState<ShippingInvoiceData | null>(null);
  const [invoiceModalMode, setInvoiceModalMode] = useState<
    "A4_INVOICE" | "THERMAL_LABEL"
  >("A4_INVOICE");

  const inputRef = useRef<HTMLInputElement>(null);

  // Keep focus on input for USB hardware scanner
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
        const exists = cart.some((c) => c.unitBarcode === data.unitBarcode);
        if (exists) {
          setError(`Unit barcode ${data.unitBarcode} is already in the cart.`);
        } else {
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
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
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
          customerName,
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Checkout failed");
      }

      setCheckoutSuccess(data);
      setCart([]);
      setLastLookup(null);
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
      channel: "POS",
      orderDate: checkoutSuccess.createdAt || new Date(),
      buyerName: customerName || "Walk-in Retail Customer",
      shippingAddress: "Local Counter Pickup / Direct Sale",
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
            <span>Scan & POS Retail Checkout</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Use USB Hardware Barcode Scanner or type unit barcode string to perform instant lookup & checkout.
          </p>
        </div>
      </div>

      {/* Main Grid: Scanner Left, Cart Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Barcode Scanner Input & Lookup Card */}
        <div className="lg:col-span-7 space-y-6">
          {/* Scan Barcode Form */}
          <form onSubmit={handleScanSubmit} className="bg-white border border-[#cce7ed] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-[#056468] uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4" />
                Hardware Barcode Scanner Input
              </label>
              <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Scanner Ready
              </span>
            </div>

            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Scan or type unit barcode (e.g. 298000000001)..."
                className="flex-1 bg-slate-50 border-2 border-[#056468]/60 rounded-xl px-4 py-3 text-lg font-mono font-bold text-[#0b252c] placeholder-slate-400 focus:outline-none focus:border-[#056468]"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-[#056468] hover:bg-[#044e51] text-white font-medium text-sm rounded-xl shadow-sm flex items-center gap-2"
              >
                <ScanBarcode className="w-4 h-4" />
                {loading ? "Scanning..." : "Scan Item"}
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              Pressing Enter or pulling scanner trigger instantly queries unit status and adds to cart.
            </p>
          </form>

          {/* Feedback alerts */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                {error}
              </span>
              <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {checkoutSuccess && (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3 shadow-sm">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                <div>
                  <h3 className="font-semibold text-lg text-emerald-950">
                    Sale Completed — Order {checkoutSuccess.orderNumber}
                  </h3>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Successfully sold {checkoutSuccess.itemCount} per-unit barcodes for total ₹{checkoutSuccess.totalAmount.toFixed(2)}. Stock automatically updated!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Last Scanned Unit Inspection */}
          {lastLookup && (
            <div className="bg-white border border-[#cce7ed] rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
                Last Scanned Unit Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] text-slate-500">Product Name</span>
                  <div className="font-semibold text-[#0b252c] text-base">{lastLookup.productName}</div>
                  <div className="text-xs text-slate-500 font-mono">SKU: {lastLookup.sku}</div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-500">Per-Unit Serial Barcode</span>
                  <div className="font-mono font-medium text-[#056468] text-sm">{lastLookup.unitBarcode}</div>
                  {lastLookup.serialNumber && (
                    <div className="text-xs text-[#056468] font-semibold">Unit #{lastLookup.serialNumber}</div>
                  )}
                </div>
              </div>

              <div className="bg-[#f2f9fa] p-4 rounded-xl border border-[#cce7ed] flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500">Unit Status</span>
                  <div className="mt-0.5">
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-medium ${
                        lastLookup.unitStatus === "AVAILABLE"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {lastLookup.unitStatus}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-500">Selling Price</span>
                  <div className="text-lg font-bold text-emerald-700">₹{(lastLookup.price || 0).toFixed(2)}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: POS Cart & Checkout */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-[#cce7ed] rounded-2xl p-6 shadow-sm space-y-6 flex flex-col justify-between min-h-[500px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-lg font-semibold text-[#0b252c] flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-[#056468]" />
                  <span>POS Scanned Cart</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#e3f2f5] text-[#056468] border border-[#cce7ed] font-mono">
                    {cart.length} Items
                  </span>
                </h2>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-xs font-medium text-rose-600 hover:text-rose-700"
                  >
                    Clear Cart
                  </button>
                )}
              </div>

              {/* Customer Input */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Customer Name / Type
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl px-3 py-2 text-xs text-[#0b252c] focus:outline-none focus:border-[#056468]"
                />
              </div>

              {/* Cart Line Items */}
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    Cart is empty. Scan items to add unit barcodes.
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-[#f2f9fa] border border-[#cce7ed] rounded-xl p-3 flex items-center justify-between text-xs space-x-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[#0b252c] truncate">{item.productName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {item.unitBarcode} <span className="text-[#056468]">(Unit #{item.serialNumber})</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-semibold text-emerald-700 font-mono">
                          ₹{(item.price || 0).toFixed(2)}
                        </div>
                        <button
                          onClick={() => removeFromCart(idx)}
                          className="text-[10px] text-rose-600 hover:text-rose-700 font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#056468]" />
                  <span>Payment Method:</span>
                </label>
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
                        className={`p-2 rounded-xl border text-center font-bold transition-all flex flex-col items-center justify-center gap-1 ${
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

            {/* Cart Summary & Complete Sale */}
            <div className="border-t border-slate-100 pt-4 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">Total Sale Amount:</span>
                <span className="font-bold text-2xl text-emerald-700 font-mono">
                  ₹{cartTotal.toFixed(2)}
                </span>
              </div>

              <button
                onClick={handleCompleteSale}
                disabled={cart.length === 0 || checkoutLoading}
                className="w-full py-3 rounded-xl bg-[#056468] hover:bg-[#044e51] text-white font-medium text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                {checkoutLoading ? "Processing Sale..." : `Complete Sale (Paid via ${paymentMethod})`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Success Banner with Instant Print Options */}
      {checkoutSuccess && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 shadow-md animate-in fade-in space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-emerald-950">
                  Sale Completed Successfully! (#{checkoutSuccess.orderNumber})
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Total: <strong>₹{(checkoutSuccess.totalAmount || 0).toFixed(2)}</strong> • Payment: <strong className="uppercase bg-emerald-200/80 px-1.5 py-0.5 rounded text-emerald-950">{checkoutSuccess.paymentMethod || paymentMethod}</strong> • Stock updated automatically.
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
                <span>Print Thermal Label</span>
              </button>

              <button
                type="button"
                onClick={() => setCheckoutSuccess(null)}
                className="p-2 text-slate-400 hover:text-slate-700"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

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

