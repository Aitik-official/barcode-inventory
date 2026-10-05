"use client";

import { useState, useMemo } from "react";
import {
  ShoppingBag,
  FileText,
  Mail,
  Receipt,
  Plus,
  ArrowRight,
  X,
  Send,
  Printer,
  Globe,
  Store,
  QrCode,
  CheckSquare,
  Square,
  Search,
  Truck,
  ExternalLink,
  PackageCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import {
  PrintShippingInvoiceDialog,
  ShippingInvoiceData,
} from "@/components/PrintShippingInvoiceDialog";

interface UnifiedOrder {
  id: string;
  orderNumber: string;
  channel: "AMAZON" | "FLIPKART" | "WEBSITE" | "POS";
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
  buyerCity?: string;
  buyerState?: string;
  buyerPincode?: string;
  totalAmount: number;
  status: string;
  createdAt: string | Date;
  trackingNumber?: string;
  courier?: string;
  items: Array<{
    title: string;
    sku: string;
    asinOrFsn?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  rawOrder?: any;
}

export default function OrdersClient({
  orders = [],
  marketplaceOrders = [],
  quotations = [],
  enquiries = [],
  invoices = [],
  customers = [],
}: {
  orders: any[];
  marketplaceOrders?: any[];
  quotations: any[];
  enquiries: any[];
  invoices: any[];
  customers: any[];
}) {
  const [activeTab, setActiveTab] = useState<"orders" | "quotations" | "enquiries" | "invoices">("orders");
  const [channelBatchFilter, setChannelBatchFilter] = useState<"ALL" | "WEBSITE" | "AMAZON" | "FLIPKART" | "POS">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [shippingInvoiceData, setShippingInvoiceData] = useState<ShippingInvoiceData | null>(null);
  const [invoiceModalMode, setInvoiceModalMode] = useState<"A4_INVOICE" | "THERMAL_LABEL">("A4_INVOICE");

  // Create Quotation Modal
  const [quoModalOpen, setQuoModalOpen] = useState(false);
  const [quoCustomerId, setQuoCustomerId] = useState("");
  const [quoAmount, setQuoAmount] = useState("1500");
  const [quoNotes, setQuoNotes] = useState("");
  const [selectedEnquiry, setSelectedEnquiry] = useState<any>(null);
  const [quoLoading, setQuoLoading] = useState(false);

  // Submit Enquiry Modal
  const [enqModalOpen, setEnqModalOpen] = useState(false);
  const [enqName, setEnqName] = useState("");
  const [enqItemName, setEnqItemName] = useState("Letterhead Printing");
  const [enqMessage, setEnqMessage] = useState("");
  const [enqPhone, setEnqPhone] = useState("");
  const [enqLoading, setEnqLoading] = useState(false);

  // Unify standard orders and marketplace orders
  const unifiedOrders: UnifiedOrder[] = useMemo(() => {
    const list: UnifiedOrder[] = [];

    // 1. Local Orders (Website / POS / Direct)
    orders.forEach((ord) => {
      const isPos = ord.orderNumber?.startsWith("POS-") || ord.customerName?.toLowerCase().includes("walk-in");
      const orderItems = (ord.items || []).map((i: any) => ({
        title: i.name || i.productVariant?.product?.name || "Inventory Product",
        sku: i.sku || i.productVariant?.sku || "PROD",
        unitBarcode: i.unitBarcode?.barcode || undefined,
        quantity: i.quantity || 1,
        unitPrice: i.unitPrice || 0,
        totalPrice: i.totalPrice || (i.quantity || 1) * (i.unitPrice || 0),
      }));

      list.push({
        id: ord.id,
        orderNumber: ord.orderNumber,
        channel: isPos ? "POS" : "WEBSITE",
        customerName: ord.customerName || (isPos ? "Walk-in Retail Customer" : "Store Customer"),
        customerEmail: ord.customerEmail || "",
        customerPhone: ord.customerPhone || "",
        shippingAddress: ord.shippingAddress || (isPos ? "Local Store Pickup" : "Direct Dispatch"),
        totalAmount: ord.totalAmount || 0,
        status: ord.status || "CONFIRMED",
        createdAt: ord.createdAt,
        items: orderItems,
        rawOrder: ord,
      });
    });

    // 2. Marketplace Orders (Amazon SP-API & Flipkart)
    marketplaceOrders.forEach((mord) => {
      const isAmazon = mord.channel === "AMAZON";
      list.push({
        id: mord.id,
        orderNumber: mord.channelOrderId,
        channel: isAmazon ? "AMAZON" : "FLIPKART",
        customerName: mord.buyerName || (isAmazon ? "Amazon Customer" : "Flipkart Buyer"),
        shippingAddress: mord.shippingAddress || `${mord.buyerCity || ""}, ${mord.buyerState || ""} - ${mord.buyerPincode || ""}`.trim() || "Marketplace Logistics",
        buyerCity: mord.buyerCity,
        buyerState: mord.buyerState,
        buyerPincode: mord.buyerPincode,
        totalAmount: mord.totalAmount || 0,
        status: mord.orderStatus || "UNSHIPPED",
        createdAt: mord.orderDate || mord.createdAt,
        trackingNumber: mord.trackingNumber || undefined,
        courier: mord.courier || (isAmazon ? "Amazon ATS Express" : "Ekart Logistics"),
        items: (mord.items || []).map((i: any) => ({
          title: i.title || "Marketplace Product",
          sku: i.channelSku || "SKU",
          asinOrFsn: i.asinOrFsn || undefined,
          quantity: i.quantity || 1,
          unitPrice: i.itemPrice || 0,
          totalPrice: (i.itemPrice || 0) * (i.quantity || 1),
        })),
        rawOrder: mord,
      });
    });

    // Sort newest first
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, marketplaceOrders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return unifiedOrders.filter((ord) => {
      // Channel Batch Filter
      if (channelBatchFilter !== "ALL" && ord.channel !== channelBatchFilter) {
        return false;
      }
      // Status Filter
      if (statusFilter !== "ALL" && ord.status.toUpperCase() !== statusFilter.toUpperCase()) {
        return false;
      }
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNum = ord.orderNumber.toLowerCase().includes(q);
        const matchesCust = ord.customerName.toLowerCase().includes(q);
        const matchesTracking = (ord.trackingNumber || "").toLowerCase().includes(q);
        const matchesSku = ord.items.some((i) => i.sku.toLowerCase().includes(q) || (i.asinOrFsn || "").toLowerCase().includes(q));
        if (!matchesNum && !matchesCust && !matchesTracking && !matchesSku) {
          return false;
        }
      }
      return true;
    });
  }, [unifiedOrders, channelBatchFilter, statusFilter, searchQuery]);

  // Batch Metrics
  const batchCounts = useMemo(() => {
    return {
      all: unifiedOrders.length,
      allAmount: unifiedOrders.reduce((acc, o) => acc + o.totalAmount, 0),
      website: unifiedOrders.filter((o) => o.channel === "WEBSITE").length,
      websiteAmount: unifiedOrders.filter((o) => o.channel === "WEBSITE").reduce((acc, o) => acc + o.totalAmount, 0),
      amazon: unifiedOrders.filter((o) => o.channel === "AMAZON").length,
      amazonAmount: unifiedOrders.filter((o) => o.channel === "AMAZON").reduce((acc, o) => acc + o.totalAmount, 0),
      flipkart: unifiedOrders.filter((o) => o.channel === "FLIPKART").length,
      flipkartAmount: unifiedOrders.filter((o) => o.channel === "FLIPKART").reduce((acc, o) => acc + o.totalAmount, 0),
      pos: unifiedOrders.filter((o) => o.channel === "POS").length,
      posAmount: unifiedOrders.filter((o) => o.channel === "POS").reduce((acc, o) => acc + o.totalAmount, 0),
    };
  }, [unifiedOrders]);

  // Multi-select toggle
  const toggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    }
  };

  // Map invoices by orderId or orderNumber
  const invoiceMap = useMemo(() => {
    const map: Record<string, any> = {};
    invoices.forEach((inv) => {
      if (inv.orderId) map[inv.orderId] = inv;
      if (inv.order?.orderNumber) map[inv.order.orderNumber] = inv;
    });
    return map;
  }, [invoices]);

  // Open single order invoice
  const handleOpenSingleInvoice = (
    ord: UnifiedOrder,
    mode: "A4_INVOICE" | "THERMAL_LABEL" = "A4_INVOICE"
  ) => {
    setInvoiceModalMode(mode);

    const existingInvoice = invoiceMap[ord.id] || invoiceMap[ord.orderNumber];

    // Fallback if order has no items stored in database
    const resolvedItems =
      ord.items && ord.items.length > 0
        ? ord.items.map((i: any) => ({
            title: i.title || "Inventory Item",
            sku: i.sku || "SKU",
            asinOrFsn: i.asinOrFsn,
            unitBarcode: i.unitBarcode,
            hsn: "8525",
            quantity: i.quantity || 1,
            unitPrice: i.unitPrice || ord.totalAmount,
            total: i.totalPrice || ord.totalAmount,
          }))
        : [
            {
              title: `${
                ord.channel === "POS" ? "POS Counter Sale Product" : "Store Product Item"
              } (${ord.orderNumber})`,
              sku: `SKU-${ord.orderNumber.replace(/[^a-zA-Z0-9]/g, "") || "PROD"}`,
              hsn: "8525",
              quantity: 1,
              unitPrice: ord.totalAmount,
              total: ord.totalAmount,
            },
          ];

    setShippingInvoiceData({
      orderId: ord.orderNumber,
      orderDbId: ord.id,
      isSavedInDb: Boolean(existingInvoice),
      invoiceNumber: existingInvoice?.invoiceNumber,
      invoiceDate: existingInvoice?.createdAt || ord.createdAt,
      channel:
        ord.channel === "AMAZON"
          ? "AMAZON"
          : ord.channel === "FLIPKART"
          ? "FLIPKART"
          : ord.channel === "POS"
          ? "POS"
          : "WEBSITE",
      orderDate: ord.createdAt,
      buyerName: ord.customerName,
      buyerEmail: ord.customerEmail,
      buyerPhone: ord.customerPhone,
      shippingAddress: ord.shippingAddress || "Local Store Pickup / Dispatch",
      city: ord.buyerCity,
      state: ord.buyerState,
      pincode: ord.buyerPincode,
      trackingNumber:
        ord.trackingNumber ||
        `AWB-${ord.orderNumber.replace(/[^0-9]/g, "").slice(-8) || "89230192"}`,
      courier:
        ord.courier ||
        (ord.channel === "AMAZON"
          ? "Amazon ATS Express"
          : ord.channel === "FLIPKART"
          ? "Ekart Logistics"
          : "Standard Logistics"),
      totalAmount: ord.totalAmount,
      items: resolvedItems,
    });
  };

  // Batch Print Selected Invoices
  const handleBatchPrintSelected = () => {
    const selected = filteredOrders.filter((o) => selectedOrderIds.includes(o.id));
    if (selected.length === 0) return;

    // Use the first selected order to initialize dialog (or combine items)
    const first = selected[0];
    const combinedItems = selected.flatMap((o) =>
      o.items.map((i) => ({
        title: `[${o.orderNumber}] ${i.title}`,
        sku: i.sku,
        asinOrFsn: i.asinOrFsn,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.totalPrice,
      }))
    );

    setShippingInvoiceData({
      orderId: selected.length === 1 ? first.orderNumber : `BATCH-${selected.length}-ORDERS`,
      channel: first.channel === "AMAZON" ? "AMAZON" : first.channel === "FLIPKART" ? "FLIPKART" : "DIRECT",
      orderDate: new Date(),
      buyerName: selected.length === 1 ? first.customerName : `Batch (${selected.length} Shipments)`,
      shippingAddress: (selected.length === 1 ? first.shippingAddress : "Multiple Delivery Addresses") || "Warehouse Dispatch",
      totalAmount: selected.reduce((acc, o) => acc + o.totalAmount, 0),
      trackingNumber: first.trackingNumber || "BATCH-SHIPMENT",
      courier: first.courier || "Multi-Carrier Dispatch",
      items: combinedItems,
    });
  };

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuoLoading(true);

    try {
      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: quoCustomerId || null,
          totalAmount: quoAmount,
          notes: quoNotes,
          enquiryId: selectedEnquiry?.id || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create quotation");
      }

      setQuoModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setQuoLoading(false);
    }
  };

  const handleCreateEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnqLoading(true);

    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: enqName,
          itemName: enqItemName,
          message: enqMessage,
          phone: enqPhone,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to log enquiry");
      }

      setEnqModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setEnqLoading(false);
    }
  };

  const handleGenerateInvoice = async (order: any) => {
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          customerId: order.customerId,
          subtotal: order.totalAmount,
          gstRate: 18,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate invoice");
      }

      alert("Invoice generated successfully!");
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 py-2">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#cce7ed] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0b252c] flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-[#056468]" />
            <span>Orders & Multi-Channel Batch Hub</span>
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Real-time batch fulfillment for <strong>Website Storefront</strong>, <strong>Amazon SP-API</strong>, <strong>Flipkart Marketplace</strong> & <strong>POS Scanner</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setEnqModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#0b252c] font-medium text-xs border border-[#cce7ed] shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Mail className="w-3.5 h-3.5 text-[#056468]" />
            <span>Submit Enquiry</span>
          </button>
          <button
            onClick={() => {
              setSelectedEnquiry(null);
              setQuoModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-[#056468] hover:bg-[#044e51] text-white font-medium text-xs shadow transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Quotation</span>
          </button>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#cce7ed] pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("orders")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "orders"
              ? "bg-[#056468] text-white shadow-sm"
              : "text-slate-600 hover:text-[#0b252c] hover:bg-white/60"
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>All Orders ({unifiedOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("quotations")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "quotations"
              ? "bg-[#056468] text-white shadow-sm"
              : "text-slate-600 hover:text-[#0b252c] hover:bg-white/60"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>B2B Quotations ({quotations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("enquiries")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "enquiries"
              ? "bg-[#056468] text-white shadow-sm"
              : "text-slate-600 hover:text-[#0b252c] hover:bg-white/60"
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Enquiries ({enquiries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("invoices")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shrink-0 ${
            activeTab === "invoices"
              ? "bg-[#056468] text-white shadow-sm"
              : "text-slate-600 hover:text-[#0b252c] hover:bg-white/60"
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Invoices ({invoices.length})</span>
        </button>
      </div>

      {/* TAB 1: ORDERS & CHANNEL BATCHES */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          {/* Channel Batch Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* All Batches */}
            <div
              onClick={() => setChannelBatchFilter("ALL")}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                channelBatchFilter === "ALL"
                  ? "bg-white border-[#056468] shadow-md ring-2 ring-[#056468]/20"
                  : "bg-white/80 border-slate-200 hover:bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                <span>All Orders</span>
                <ShoppingBag className="w-4 h-4 text-[#056468]" />
              </div>
              <div className="text-xl font-extrabold text-slate-900">{batchCounts.all}</div>
              <div className="text-[11px] font-bold text-emerald-700 mt-0.5">
                ₹{batchCounts.allAmount.toLocaleString("en-IN")}
              </div>
            </div>

            {/* Website Batch */}
            <div
              onClick={() => setChannelBatchFilter("WEBSITE")}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                channelBatchFilter === "WEBSITE"
                  ? "bg-white border-emerald-600 shadow-md ring-2 ring-emerald-600/20"
                  : "bg-white/80 border-slate-200 hover:bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold mb-1">
                <span className="flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-emerald-600" />
                  Website Store
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Direct</span>
              </div>
              <div className="text-xl font-extrabold text-slate-900">{batchCounts.website}</div>
              <div className="text-[11px] font-bold text-emerald-700 mt-0.5">
                ₹{batchCounts.websiteAmount.toLocaleString("en-IN")}
              </div>
            </div>

            {/* Amazon Batch */}
            <div
              onClick={() => setChannelBatchFilter("AMAZON")}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                channelBatchFilter === "AMAZON"
                  ? "bg-white border-amber-500 shadow-md ring-2 ring-amber-500/20"
                  : "bg-white/80 border-slate-200 hover:bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-amber-800 font-semibold mb-1">
                <span className="flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-amber-600" />
                  Amazon SP-API
                </span>
                <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold">ATS</span>
              </div>
              <div className="text-xl font-extrabold text-slate-900">{batchCounts.amazon}</div>
              <div className="text-[11px] font-bold text-amber-800 mt-0.5">
                ₹{batchCounts.amazonAmount.toLocaleString("en-IN")}
              </div>
            </div>

            {/* Flipkart Batch */}
            <div
              onClick={() => setChannelBatchFilter("FLIPKART")}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                channelBatchFilter === "FLIPKART"
                  ? "bg-white border-blue-500 shadow-md ring-2 ring-blue-500/20"
                  : "bg-white/80 border-slate-200 hover:bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-blue-800 font-semibold mb-1">
                <span className="flex items-center gap-1">
                  <PackageCheck className="w-3.5 h-3.5 text-blue-600" />
                  Flipkart Ekart
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded font-bold">Market</span>
              </div>
              <div className="text-xl font-extrabold text-slate-900">{batchCounts.flipkart}</div>
              <div className="text-[11px] font-bold text-blue-800 mt-0.5">
                ₹{batchCounts.flipkartAmount.toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          {/* Batch Selector Bar & Action Controls */}
          <div className="bg-white border border-[#cce7ed] rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Channel Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">Batch:</span>
                {[
                  { key: "ALL", label: `All Channels (${unifiedOrders.length})` },
                  { key: "WEBSITE", label: `Website Store (${batchCounts.website})` },
                  { key: "AMAZON", label: `Amazon (${batchCounts.amazon})` },
                  { key: "FLIPKART", label: `Flipkart (${batchCounts.flipkart})` },
                  { key: "POS", label: `POS Scan (${batchCounts.pos})` },
                ].map((b) => (
                  <button
                    key={b.key}
                    onClick={() => setChannelBatchFilter(b.key as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      channelBatchFilter === b.key
                        ? "bg-[#056468] text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>

              {/* Search & Status Filter */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Order #, SKU, Buyer..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#056468]"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="UNSHIPPED">Unshipped</option>
                  <option value="SHIPPED">Shipped</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="CONFIRMED">Confirmed</option>
                </select>
              </div>
            </div>

            {/* Batch Selection Action Bar */}
            {selectedOrderIds.length > 0 && (
              <div className="bg-[#e3f2f5] border border-[#056468]/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-bold text-[#056468]">
                  <CheckSquare className="w-4 h-4 text-[#056468]" />
                  <span>{selectedOrderIds.length} orders selected for batch processing</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBatchPrintSelected}
                    className="px-3.5 py-1.5 rounded-lg bg-[#056468] hover:bg-[#044e51] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Batch Print 100×150mm Shipping Invoices</span>
                  </button>
                  <button
                    onClick={() => setSelectedOrderIds([])}
                    className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium"
                  >
                    Deselect
                  </button>
                </div>
              </div>
            )}

            {/* Orders Table */}
            <div className="overflow-x-auto rounded-xl border border-[#cce7ed]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f2f9fa] text-[#0b252c] font-semibold uppercase tracking-wider border-b border-[#cce7ed]">
                  <tr>
                    <th className="p-3 w-8">
                      <button
                        type="button"
                        onClick={selectAllFiltered}
                        className="text-slate-500 hover:text-slate-800"
                        title="Select All Filtered"
                      >
                        {selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-[#056468]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="p-3">Channel Batch</th>
                    <th className="p-3">Order ID / Date</th>
                    <th className="p-3">Buyer & Destination</th>
                    <th className="p-3">Items & SKUs</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status / Tracking</th>
                    <th className="p-3 text-right whitespace-nowrap min-w-[240px]">Label & Invoice Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 font-sans">
                        No orders matching current batch filter (<strong>{channelBatchFilter}</strong>). Sync marketplace orders in Channels tab.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((ord) => {
                      const isSelected = selectedOrderIds.includes(ord.id);
                      const existingInv = invoiceMap[ord.id] || invoiceMap[ord.orderNumber];
                      return (
                        <tr
                          key={ord.id}
                          className={`transition-colors ${
                            isSelected ? "bg-[#e3f2f5]/50" : "hover:bg-slate-50/80"
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => toggleSelectOrder(ord.id)}
                              className="text-slate-400 hover:text-slate-700"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-[#056468]" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          {/* Channel Badge */}
                          <td className="p-3">
                            {ord.channel === "AMAZON" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
                                <Store className="w-3 h-3 text-amber-600" />
                                <span>Amazon ATS</span>
                              </span>
                            ) : ord.channel === "FLIPKART" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-300 shadow-2xs">
                                <PackageCheck className="w-3 h-3 text-blue-600" />
                                <span>Flipkart Ekart</span>
                              </span>
                            ) : ord.channel === "POS" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-purple-50 text-purple-900 border border-purple-300 shadow-2xs">
                                <QrCode className="w-3 h-3 text-purple-600" />
                                <span>POS Quick Scan</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-2xs">
                                <Globe className="w-3 h-3 text-emerald-700" />
                                <span>Website Store</span>
                              </span>
                            )}
                          </td>

                          {/* Order ID & Date */}
                          <td className="p-3 font-medium">
                            <span className="font-mono text-xs text-[#056468] font-bold block">
                              {ord.orderNumber}
                            </span>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {new Date(ord.createdAt).toLocaleDateString()}
                            </span>
                            {existingInv && (
                              <button
                                type="button"
                                onClick={() => setActiveTab("invoices")}
                                className="mt-1 inline-flex items-center gap-1 text-[9.5px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded hover:bg-emerald-100 transition-colors cursor-pointer"
                                title="Click to view in Invoices Tab"
                              >
                                <Receipt className="w-3 h-3 text-emerald-600" />
                                <span>{existingInv.invoiceNumber}</span>
                              </button>
                            )}
                          </td>

                          {/* Buyer & Destination */}
                          <td className="p-3">
                            <span className="font-semibold text-slate-900 block truncate max-w-[150px]">
                              {ord.customerName}
                            </span>
                            <span className="text-[11px] text-slate-500 block truncate max-w-[180px]">
                              {ord.shippingAddress}
                            </span>
                          </td>

                          {/* Items & SKU */}
                          <td className="p-3">
                            <div className="space-y-0.5">
                              {ord.items.slice(0, 2).map((itm, idx) => (
                                <div key={idx} className="text-[11px] flex items-center gap-1.5 text-slate-700">
                                  <span className="font-bold text-[#056468]">{itm.quantity}x</span>
                                  <span className="font-mono font-medium text-slate-900 bg-slate-100 px-1 rounded text-[10px]">
                                    {itm.sku}
                                  </span>
                                  {itm.asinOrFsn && (
                                    <span className="text-[9px] font-mono text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                                      {itm.asinOrFsn}
                                    </span>
                                  )}
                                </div>
                              ))}
                              {ord.items.length > 2 && (
                                <span className="text-[10px] text-slate-400 italic">
                                  +{ord.items.length - 2} more item(s)
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="p-3 font-bold text-slate-900">
                            ₹{ord.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>

                          {/* Status & Courier Tracking */}
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider block w-fit ${
                                ord.status === "SHIPPED" || ord.status === "DELIVERED"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : ord.status === "UNSHIPPED" || ord.status === "PENDING"
                                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {ord.status}
                            </span>
                            {ord.trackingNumber && (
                              <span className="text-[10px] font-mono text-slate-500 mt-1 flex items-center gap-1">
                                <Truck className="w-3 h-3 text-slate-400" />
                                <span className="truncate max-w-[110px]">{ord.trackingNumber}</span>
                              </span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="p-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2 flex-nowrap">
                              {/* Full A4 GST Tax Invoice Option */}
                              <button
                                type="button"
                                onClick={() => handleOpenSingleInvoice(ord, "A4_INVOICE")}
                                className="px-3 py-1.5 bg-[#056468] hover:bg-[#044e51] text-white font-bold text-xs rounded-lg shadow-2xs inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer"
                                title="View & Print Full Professional A4 GST Tax Invoice"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Tax Invoice</span>
                              </button>

                              {/* 100x150mm Thermal Shipping Label Option */}
                              <button
                                type="button"
                                onClick={() => handleOpenSingleInvoice(ord, "THERMAL_LABEL")}
                                className="px-3 py-1.5 bg-white border border-[#cce7ed] hover:bg-[#f0f8fa] text-[#056468] font-bold text-xs rounded-lg shadow-2xs inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer"
                                title="Print 100x150mm (4x6) Thermal Courier Shipping Label"
                              >
                                <Printer className="w-3.5 h-3.5 text-[#056468]" />
                                <span>100×150mm Label</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: QUOTATIONS */}
      {activeTab === "quotations" && (
        <div className="bg-white border border-[#cce7ed] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-semibold text-[#0b252c] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#056468]" />
                B2B Quotations Directory
              </h2>
              <p className="text-xs text-slate-500">
                Formal quotations sent to B2B customers for pricing approval.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedEnquiry(null);
                setQuoModalOpen(true);
              }}
              className="px-4 py-2 bg-[#056468] hover:bg-[#044e51] text-white font-medium text-xs rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Quotation
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#cce7ed]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f2f9fa] text-[#0b252c] font-semibold uppercase tracking-wider border-b border-[#cce7ed]">
                <tr>
                  <th className="p-3.5">Quotation #</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Total Amount</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Notes</th>
                  <th className="p-3.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {quotations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                      No quotations issued yet.
                    </td>
                  </tr>
                ) : (
                  quotations.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/70">
                      <td className="p-3.5 font-medium text-[#056468] font-mono">{q.quotationNumber}</td>
                      <td className="p-3.5 font-medium text-[#0b252c]">
                        {q.customer?.name || "B2B Client"}
                      </td>
                      <td className="p-3.5 font-semibold text-emerald-700">₹{q.totalAmount.toFixed(2)}</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          {q.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 max-w-xs truncate">{q.notes || "-"}</td>
                      <td className="p-3.5 text-slate-600">
                        {new Date(q.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ENQUIRIES */}
      {activeTab === "enquiries" && (
        <div className="bg-white border border-[#cce7ed] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-semibold text-[#0b252c] flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#056468]" />
                Printing & Service Enquiries
              </h2>
              <p className="text-xs text-slate-500">
                Customer enquiries for custom printing services. Convert directly into quotations.
              </p>
            </div>
            <button
              onClick={() => setEnqModalOpen(true)}
              className="px-4 py-2 bg-[#056468] hover:bg-[#044e51] text-white font-medium text-xs rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Service Enquiry
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {enquiries.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-slate-500 text-xs">
                No customer enquiries submitted yet.
              </div>
            ) : (
              enquiries.map((e) => (
                <div key={e.id} className="bg-[#f2f9fa] border border-[#cce7ed] p-5 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-[#0b252c] text-base">{e.name}</h3>
                      <span className="text-xs text-[#056468] font-medium">Target Item: {e.itemName}</span>
                    </div>
                    <span className="text-xs px-2.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                      {e.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-[#cce7ed]/80">
                    "{e.message}"
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-[#cce7ed] text-xs">
                    <span className="text-slate-500">Phone: {e.phone || "N/A"}</span>
                    <button
                      onClick={() => {
                        setSelectedEnquiry(e);
                        setQuoModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-[#056468] hover:bg-[#044e51] text-white font-medium text-xs rounded-lg shadow-sm flex items-center gap-1"
                    >
                      <span>Send Quotation</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: INVOICES */}
      {activeTab === "invoices" && (
        <div className="bg-white border border-[#cce7ed] rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-[#0b252c] flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#056468]" />
            Tax Invoices Directory
          </h2>

          <div className="overflow-x-auto rounded-xl border border-[#cce7ed]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f2f9fa] text-[#0b252c] font-semibold uppercase tracking-wider border-b border-[#cce7ed]">
                <tr>
                  <th className="p-3.5">Invoice #</th>
                  <th className="p-3.5">Subtotal</th>
                  <th className="p-3.5">CGST (9%)</th>
                  <th className="p-3.5">SGST (9%)</th>
                  <th className="p-3.5">Grand Total</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">
                      No tax invoices generated yet. Click "Generate Invoice" on an order.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70">
                      <td className="p-3.5 font-medium text-[#056468] font-mono">{inv.invoiceNumber}</td>
                      <td className="p-3.5 text-slate-600">₹{inv.subtotal.toFixed(2)}</td>
                      <td className="p-3.5 text-slate-500">₹{inv.cgst.toFixed(2)}</td>
                      <td className="p-3.5 text-slate-500">₹{inv.sgst.toFixed(2)}</td>
                      <td className="p-3.5 font-semibold text-emerald-700 text-sm">
                        ₹{inv.grandTotal.toFixed(2)}
                      </td>
                      <td className="p-3.5 text-slate-600">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setInvoiceModalMode("A4_INVOICE");
                              setShippingInvoiceData({
                                orderId: inv.orderId || inv.invoiceNumber,
                                invoiceNumber: inv.invoiceNumber,
                                invoiceDate: inv.createdAt,
                                buyerName: inv.customer?.name || "Customer",
                                shippingAddress: inv.customer?.address || "Warehouse Dispatch / Local Pickup",
                                city: inv.customer?.city || undefined,
                                state: inv.customer?.state || undefined,
                                pincode: inv.customer?.zip || undefined,
                                totalAmount: inv.grandTotal,
                                items: [
                                  {
                                    title: `Products under Tax Invoice ${inv.invoiceNumber}`,
                                    sku: `INV-${inv.invoiceNumber.replace(/[^a-zA-Z0-9]/g, "")}`,
                                    hsn: "8525",
                                    quantity: 1,
                                    unitPrice: inv.subtotal,
                                    taxRate: 18,
                                    total: inv.grandTotal,
                                  },
                                ],
                              });
                            }}
                            className="px-2.5 py-1.5 bg-[#056468] hover:bg-[#044e51] text-white font-bold text-[11px] rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer"
                            title="View & Print Full Professional A4 GST Tax Invoice"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Tax Invoice</span>
                          </button>

                          <button
                            onClick={() => {
                              setInvoiceModalMode("THERMAL_LABEL");
                              setShippingInvoiceData({
                                orderId: inv.orderId || inv.invoiceNumber,
                                invoiceNumber: inv.invoiceNumber,
                                invoiceDate: inv.createdAt,
                                buyerName: inv.customer?.name || "Customer",
                                shippingAddress: inv.customer?.address || "Warehouse Dispatch / Local Pickup",
                                city: inv.customer?.city || undefined,
                                state: inv.customer?.state || undefined,
                                pincode: inv.customer?.zip || undefined,
                                totalAmount: inv.grandTotal,
                                items: [
                                  {
                                    title: `Products under Tax Invoice ${inv.invoiceNumber}`,
                                    sku: `INV-${inv.invoiceNumber.replace(/[^a-zA-Z0-9]/g, "")}`,
                                    hsn: "8525",
                                    quantity: 1,
                                    unitPrice: inv.subtotal,
                                    taxRate: 18,
                                    total: inv.grandTotal,
                                  },
                                ],
                              });
                            }}
                            className="px-2.5 py-1.5 bg-white border border-[#056468] hover:bg-[#e3f2f5] text-[#056468] font-bold text-[11px] rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer"
                            title="Print 100x150mm Parcel Shipping Invoice Label"
                          >
                            <Printer className="w-3.5 h-3.5 text-[#056468]" />
                            <span>100×150mm Label</span>
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
      )}

      {/* Create Quotation Modal */}
      {quoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#cce7ed] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-[#0b252c] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#056468]" />
                Issue B2B Quotation
              </h3>
              <button onClick={() => setQuoModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            {selectedEnquiry && (
              <p className="text-xs text-[#056468] bg-[#e3f2f5] p-2.5 rounded-xl border border-[#cce7ed]">
                Responding to enquiry from: <strong>{selectedEnquiry.name}</strong> ({selectedEnquiry.itemName})
              </p>
            )}

            <form onSubmit={handleCreateQuotation} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#0b252c] mb-1">Select Customer</label>
                <select
                  value={quoCustomerId}
                  onChange={(e) => setQuoCustomerId(e.target.value)}
                  className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl px-3 py-2 text-[#0b252c] text-sm focus:outline-none focus:border-[#056468]"
                >
                  <option value="">Walk-in / Custom B2B Client</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.company || "Direct"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#0b252c] mb-1">Quotation Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={quoAmount}
                  onChange={(e) => setQuoAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl px-3 py-2 text-[#0b252c] font-mono font-semibold text-sm focus:outline-none focus:border-[#056468]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#0b252c] mb-1">Notes / Terms</label>
                <textarea
                  rows={2}
                  value={quoNotes}
                  onChange={(e) => setQuoNotes(e.target.value)}
                  placeholder="Quotation validity terms, payment schedules..."
                  className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl px-3 py-2 text-[#0b252c] text-sm focus:outline-none focus:border-[#056468]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuoModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-500 hover:text-[#0b252c]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={quoLoading}
                  className="px-5 py-2 bg-[#056468] hover:bg-[#044e51] text-white font-medium rounded-xl shadow-sm"
                >
                  {quoLoading ? "Issuing..." : "Issue Quotation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Service Enquiry Modal */}
      {enqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#cce7ed] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-[#0b252c] flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#056468]" />
                Submit Printing Service Enquiry
              </h3>
              <button onClick={() => setEnqModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEnquiry} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#0b252c] mb-1">Customer / Contact Name</label>
                <input
                  type="text"
                  required
                  value={enqName}
                  onChange={(e) => setEnqName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl px-3 py-2 text-[#0b252c] text-sm focus:outline-none focus:border-[#056468]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#0b252c] mb-1">Service / Item Requested</label>
                <input
                  type="text"
                  required
                  value={enqItemName}
                  onChange={(e) => setEnqItemName(e.target.value)}
                  placeholder="e.g. Letterhead Printing (500 copies)"
                  className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl px-3 py-2 text-[#0b252c] text-sm focus:outline-none focus:border-[#056468]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#0b252c] mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={enqPhone}
                  onChange={(e) => setEnqPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl px-3 py-2 text-[#0b252c] text-sm focus:outline-none focus:border-[#056468]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#0b252c] mb-1">Enquiry Message / Details</label>
                <textarea
                  rows={2}
                  required
                  value={enqMessage}
                  onChange={(e) => setEnqMessage(e.target.value)}
                  placeholder="Details about GSM paper, printing color requirements..."
                  className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl px-3 py-2 text-[#0b252c] text-sm focus:outline-none focus:border-[#056468]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEnqModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-500 hover:text-[#0b252c]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enqLoading}
                  className="px-5 py-2 bg-[#056468] hover:bg-[#044e51] text-white font-medium rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {enqLoading ? "Submitting..." : "Submit Enquiry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tax Invoice & 100x150mm Parcel Shipping Invoice Label Print Modal */}
      {shippingInvoiceData && (
        <PrintShippingInvoiceDialog
          isOpen={!!shippingInvoiceData}
          onClose={() => setShippingInvoiceData(null)}
          data={shippingInvoiceData}
          initialMode={invoiceModalMode}
        />
      )}
    </div>
  );
}
