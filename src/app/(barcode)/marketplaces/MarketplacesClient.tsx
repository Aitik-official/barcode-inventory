"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Package,
  Layers,
  Search,
  SlidersHorizontal,
  ExternalLink,
  ShieldCheck,
  Zap,
  ShoppingBag,
  Truck,
  ScanBarcode,
  X,
  Clock,
  Sparkles,
  ChevronRight,
  Database,
  Tag,
  Boxes,
  Printer,
} from "lucide-react";
import {
  PrintShippingInvoiceDialog,
  ShippingInvoiceData,
} from "@/components/PrintShippingInvoiceDialog";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";

interface MarketplaceCredential {
  id: string;
  channel: string;
  name: string;
  sellerId: string | null;
  marketplaceId: string | null;
  appId: string | null;
  appSecret: string | null;
  refreshToken: string | null;
  sandbox: boolean;
  isActive: boolean;
  autoSyncStock: boolean;
  autoSyncOrders: boolean;
  lastSyncAt: string | Date | null;
}

interface MarketplaceMapping {
  id: string;
  credentialId: string;
  credential?: { name: string; channel: string };
  productVariantId: string;
  channel: string;
  channelSku: string;
  externalId: string | null;
  title: string | null;
  listingPrice: number;
  channelStock: number;
  fulfillmentType: string;
  syncStatus: string;
  lastStockPushAt: string | Date | null;
  lastErrorMessage: string | null;
  variantName?: string;
  productImage?: string | null;
  localSku?: string;
  availableBarcodeStock?: number;
}

interface MarketplaceOrderItem {
  id: string;
  marketplaceOrderId: string;
  orderItemId: string | null;
  channelSku: string;
  asinOrFsn: string | null;
  title: string;
  quantity: number;
  itemPrice: number;
  taxPrice: number;
  localVariantId: string | null;
  scannedBarcode: string | null;
}

interface MarketplaceOrder {
  id: string;
  credentialId: string | null;
  credential?: { name: string; channel: string } | null;
  channel: string;
  channelOrderId: string;
  orderDate: string | Date;
  orderStatus: string;
  fulfillmentChannel: string;
  buyerName: string | null;
  buyerCity: string | null;
  buyerState: string | null;
  buyerPincode: string | null;
  shippingAddress: string | null;
  totalAmount: number;
  currency: string;
  trackingNumber: string | null;
  courier: string | null;
  dispatchedAt: string | Date | null;
  items: MarketplaceOrderItem[];
}

interface VariantOption {
  id: string;
  sku: string;
  name: string;
  brand: string;
  sellingPrice: number;
  availableStock: number;
}

interface Props {
  initialCredentials: MarketplaceCredential[];
  initialMappings: MarketplaceMapping[];
  initialOrders: MarketplaceOrder[];
  variants: VariantOption[];
}

export default function MarketplacesClient({
  initialCredentials,
  initialMappings,
  initialOrders,
  variants,
}: Props) {
  const router = useRouter();

  // Active Tab: "orders" | "inventory" | "mappings" | "settings"
  const [activeTab, setActiveTab] = useState<"orders" | "inventory" | "mappings" | "settings">("orders");

  // State
  const [credentials, setCredentials] = useState<MarketplaceCredential[]>(initialCredentials);
  const [mappings, setMappings] = useState<MarketplaceMapping[]>(initialMappings);
  const [orders, setOrders] = useState<MarketplaceOrder[]>(initialOrders);

  // Filters
  const [orderChannelFilter, setOrderChannelFilter] = useState<string>("ALL");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("ALL");
  const [orderSearch, setOrderSearch] = useState<string>("");

  // Loading & Action states
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isPushingStock, setIsPushingStock] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Modals
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState<boolean>(false);
  const [editingCredential, setEditingCredential] = useState<Partial<MarketplaceCredential> | null>(null);

  const [isMappingModalOpen, setIsMappingModalOpen] = useState<boolean>(false);
  const [editingMapping, setEditingMapping] = useState<Partial<MarketplaceMapping> | null>(null);

  const [fulfillModalOrder, setFulfillModalOrder] = useState<MarketplaceOrder | null>(null);
  const [selectedOrderItem, setSelectedOrderItem] = useState<MarketplaceOrderItem | null>(null);
  const [scannedBarcodeInput, setScannedBarcodeInput] = useState<string>("");
  const [isFulfilling, setIsFulfilling] = useState<boolean>(false);
  const [shippingInvoiceModalData, setShippingInvoiceModalData] = useState<ShippingInvoiceData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "credential" | "mapping"; id: string; name: string } | null>(null);

  // Flash Message Helper
  const showFeedback = (type: "success" | "error" | "info", message: string) => {
    setActionFeedback({ type, message });
    setTimeout(() => {
      setActionFeedback(null);
    }, 6000);
  };

  // Sync Orders
  const handleSyncOrders = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/marketplaces/sync-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        showFeedback("success", data.message || "Orders synced successfully!");
        router.refresh();
        // Refresh orders
        const ordersRes = await fetch("/api/marketplaces/orders");
        const ordersData = await ordersRes.json();
        if (ordersData.orders) setOrders(ordersData.orders);
      } else {
        showFeedback("error", data.error || "Failed to sync orders");
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Error communicating with server");
    } finally {
      setIsSyncing(false);
    }
  };

  // Push Inventory Stock
  const handlePushStock = async (mappingId?: string) => {
    setIsPushingStock(true);
    try {
      const res = await fetch("/api/marketplaces/push-inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappingId }),
      });
      const data = await res.json();
      if (data.success) {
        showFeedback("success", data.message || "Stock pushed to channels successfully!");
        // Refresh mappings
        const mapRes = await fetch("/api/marketplaces/mappings");
        const mapData = await mapRes.json();
        if (mapData.mappings) setMappings(mapData.mappings);
      } else {
        showFeedback("error", data.error || "Failed to push stock");
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Error pushing stock");
    } finally {
      setIsPushingStock(false);
    }
  };

  // Test Connection
  const handleTestConnection = async (cred: Partial<MarketplaceCredential>) => {
    try {
      showFeedback("info", `Testing connection for ${cred.channel}...`);
      const res = await fetch("/api/marketplaces/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cred),
      });
      const data = await res.json();
      if (data.success) {
        showFeedback("success", `✓ ${data.message}`);
      } else {
        showFeedback("error", `✗ Connection failed: ${data.error}`);
      }
    } catch (err: any) {
      showFeedback("error", `✗ Connection error: ${err.message}`);
    }
  };

  // Save Credential
  const handleSaveCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCredential) return;

    try {
      const res = await fetch("/api/marketplaces/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingCredential),
      });
      const data = await res.json();
      if (data.success) {
        showFeedback("success", "Channel credentials saved successfully!");
        setIsCredentialModalOpen(false);
        setEditingCredential(null);
        router.refresh();
        const credsRes = await fetch("/api/marketplaces/credentials");
        const credsData = await credsRes.json();
        if (credsData.credentials) setCredentials(credsData.credentials);
      } else {
        showFeedback("error", data.error || "Failed to save credential");
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Network error");
    }
  };

  // Confirm Deletion Handler (Credential or Mapping)
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === "credential") {
        const res = await fetch(`/api/marketplaces/credentials?id=${deleteTarget.id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.success) {
          showFeedback("success", "Marketplace channel removed.");
          setCredentials(credentials.filter((c) => c.id !== deleteTarget.id));
        } else {
          showFeedback("error", data.error || "Failed to remove channel");
        }
      } else if (deleteTarget.type === "mapping") {
        const res = await fetch(`/api/marketplaces/mappings?id=${deleteTarget.id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.success) {
          showFeedback("success", "Mapping removed.");
          setMappings(mappings.filter((m) => m.id !== deleteTarget.id));
        } else {
          showFeedback("error", data.error || "Failed to remove mapping");
        }
      }
      setDeleteTarget(null);
    } catch (err: any) {
      showFeedback("error", err.message);
    }
  };

  // Save Mapping
  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMapping) return;

    try {
      const res = await fetch("/api/marketplaces/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingMapping),
      });
      const data = await res.json();
      if (data.success) {
        showFeedback("success", "SKU Mapping saved successfully!");
        setIsMappingModalOpen(false);
        setEditingMapping(null);
        const mapRes = await fetch("/api/marketplaces/mappings");
        const mapData = await mapRes.json();
        if (mapData.mappings) setMappings(mapData.mappings);
      } else {
        showFeedback("error", data.error || "Failed to save mapping");
      }
    } catch (err: any) {
      showFeedback("error", err.message);
    }
  };

  // Fulfill Order Item with Barcode Scan
  const handleFulfillScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fulfillModalOrder || !selectedOrderItem || !scannedBarcodeInput) return;

    setIsFulfilling(true);
    try {
      const res = await fetch("/api/marketplaces/orders/fulfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: fulfillModalOrder.id,
          orderItemId: selectedOrderItem.id,
          barcode: scannedBarcodeInput.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        showFeedback("success", data.message || "Item dispatched and stock deducted!");
        setScannedBarcodeInput("");

        // Auto-open 100x150mm Shipping Invoice Label for this order!
        const currentOrderToPrint = fulfillModalOrder;
        setFulfillModalOrder(null);
        setSelectedOrderItem(null);

        if (currentOrderToPrint) {
          setShippingInvoiceModalData({
            orderId: currentOrderToPrint.channelOrderId,
            channel: currentOrderToPrint.channel as any,
            orderDate: currentOrderToPrint.orderDate,
            buyerName: currentOrderToPrint.buyerName || "Customer",
            shippingAddress: currentOrderToPrint.shippingAddress || "India",
            city: currentOrderToPrint.buyerCity || undefined,
            state: currentOrderToPrint.buyerState || undefined,
            pincode: currentOrderToPrint.buyerPincode || undefined,
            courier: currentOrderToPrint.courier || undefined,
            trackingNumber: currentOrderToPrint.trackingNumber || undefined,
            totalAmount: currentOrderToPrint.totalAmount,
            items: currentOrderToPrint.items.map((i) => ({
              title: i.title,
              sku: i.channelSku,
              asinOrFsn: i.asinOrFsn || undefined,
              quantity: i.quantity,
              unitPrice: i.itemPrice,
              total: i.itemPrice * i.quantity,
            })),
          });
        }

        // Refresh orders and mappings
        const ordersRes = await fetch("/api/marketplaces/orders");
        const ordersData = await ordersRes.json();
        if (ordersData.orders) setOrders(ordersData.orders);

        const mapRes = await fetch("/api/marketplaces/mappings");
        const mapData = await mapRes.json();
        if (mapData.mappings) setMappings(mapData.mappings);
      } else {
        showFeedback("error", data.error || "Failed to fulfill with this barcode.");
      }
    } catch (err: any) {
      showFeedback("error", err.message);
    } finally {
      setIsFulfilling(false);
    }
  };

  // Seed Sample Demo Data
  const handleSeedSample = async () => {
    try {
      showFeedback("info", "Generating demo Amazon & Flipkart data...");
      const res = await fetch("/api/marketplaces/seed-sample-data", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showFeedback("success", data.message);
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }
    } catch (err: any) {
      showFeedback("error", err.message);
    }
  };

  // Filtered Orders
  const filteredOrders = orders.filter((o) => {
    if (orderChannelFilter !== "ALL" && o.channel !== orderChannelFilter) return false;
    if (orderStatusFilter !== "ALL" && o.orderStatus !== orderStatusFilter) return false;
    if (orderSearch) {
      const q = orderSearch.toLowerCase();
      const matchId = o.channelOrderId.toLowerCase().includes(q);
      const matchBuyer = (o.buyerName || "").toLowerCase().includes(q);
      const matchCity = (o.buyerCity || "").toLowerCase().includes(q);
      const matchItems = o.items.some(
        (i) => i.title.toLowerCase().includes(q) || i.channelSku.toLowerCase().includes(q)
      );
      if (!matchId && !matchBuyer && !matchCity && !matchItems) return false;
    }
    return true;
  });

  // Metrics
  const amazonOrdersCount = orders.filter((o) => o.channel === "AMAZON").length;
  const flipkartOrdersCount = orders.filter((o) => o.channel === "FLIPKART").length;
  const pendingDispatchCount = orders.filter((o) => o.orderStatus === "UNSHIPPED" || o.orderStatus === "PENDING").length;

  return (
    <div className="min-h-screen bg-[#e3f2f5] text-slate-800 pb-20">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-[#056468] via-[#087f84] to-[#0a9b9f] text-white py-8 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-1">
              <Store className="w-4 h-4" />
              <span>Multi-Channel E-Commerce Sync Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Amazon SP-API & Flipkart Marketplace Hub
            </h1>
            <p className="text-emerald-100 text-sm mt-1 max-w-2xl">
              Track incoming Amazon & Flipkart orders, manage ASIN/FSN SKU mappings, push real-time physical barcode stock, and dispatch with barcode scanner verification.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleSyncOrders}
              disabled={isSyncing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#056468] font-bold text-xs shadow hover:bg-emerald-50 transition-all active:scale-95 disabled:opacity-75"
            >
              <RefreshCw className={`w-4 h-4 text-[#056468] ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Syncing Channels..." : "Sync Orders Now"}</span>
            </button>

            <button
              onClick={() => handlePushStock()}
              disabled={isPushingStock}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs shadow transition-all active:scale-95 disabled:opacity-75"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>{isPushingStock ? "Pushing Stock..." : "Push All Stock"}</span>
            </button>

            {credentials.length === 0 && (
              <button
                onClick={handleSeedSample}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-medium border border-white/30 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Demo Sandbox Setup</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Feedback Banner */}
        {actionFeedback && (
          <div className="max-w-7xl mx-auto mt-4">
            <div
              className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in duration-200 ${
                actionFeedback.type === "success"
                  ? "bg-emerald-50 text-emerald-900 border border-emerald-300"
                  : actionFeedback.type === "error"
                  ? "bg-rose-50 text-rose-900 border border-rose-300"
                  : "bg-cyan-50 text-cyan-900 border border-cyan-300"
              }`}
            >
              <div className="flex items-center gap-2">
                {actionFeedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : actionFeedback.type === "error" ? (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-cyan-600 shrink-0" />
                )}
                <span>{actionFeedback.message}</span>
              </div>
              <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        {/* KPI Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Amazon Orders Card */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 uppercase tracking-wide">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Amazon SP-API
              </div>
              <div className="text-2xl font-black text-slate-800 mt-1">{amazonOrdersCount}</div>
              <div className="text-[11px] text-slate-500">Live Synced Orders</div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-extrabold text-sm shadow-inner">
              AMZ
            </div>
          </div>

          {/* Flipkart Orders Card */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wide">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Flipkart Hub
              </div>
              <div className="text-2xl font-black text-slate-800 mt-1">{flipkartOrdersCount}</div>
              <div className="text-[11px] text-slate-500">Live Synced Orders</div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-extrabold text-sm shadow-inner">
              FK
            </div>
          </div>

          {/* Pending Dispatches */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-rose-600 uppercase tracking-wide">Pending Dispatch</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{pendingDispatchCount}</div>
              <div className="text-[11px] text-slate-500">Awaiting Barcode Scan</div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <Truck className="w-5 h-5" />
            </div>
          </div>

          {/* Active SKU Mappings */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-emerald-700 uppercase tracking-wide">SKU Mappings</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{mappings.length}</div>
              <div className="text-[11px] text-slate-500">ASIN & FSN Connected</div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#056468]">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "orders"
                ? "bg-[#056468] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Multi-Channel Orders ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("inventory")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "inventory"
                ? "bg-[#056468] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Stock Push Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab("mappings")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "mappings"
                ? "bg-[#056468] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>SKU ↔ ASIN/FSN Mappings ({mappings.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "settings"
                ? "bg-[#056468] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>API Credentials & Settings ({credentials.length})</span>
          </button>
        </div>

        {/* TAB 1: MULTI-CHANNEL ORDERS */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Order ID, Buyer, SKU, or City..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#056468]"
                  />
                </div>

                {/* Channel Filter */}
                <select
                  value={orderChannelFilter}
                  onChange={(e) => setOrderChannelFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#056468]"
                >
                  <option value="ALL">All Marketplaces</option>
                  <option value="AMAZON">Amazon India (SP-API)</option>
                  <option value="FLIPKART">Flipkart Marketplace</option>
                </select>

                {/* Status Filter */}
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#056468]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="UNSHIPPED">Unshipped / Approved</option>
                  <option value="PROCESSING">Processing / Ready</option>
                  <option value="SHIPPED">Shipped / Dispatched</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="text-xs text-slate-500 font-medium shrink-0">
                Showing <strong className="text-slate-800">{filteredOrders.length}</strong> of {orders.length} orders
              </div>
            </div>

            {/* Orders Feed Cards */}
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <h3 className="text-base font-bold text-slate-800">No Marketplace Orders Found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  {credentials.length === 0
                    ? "Connect your Amazon SP-API and Flipkart seller accounts in Credentials & Settings or load demo data to start tracking."
                    : "No orders match the current filter. Click 'Sync Orders Now' to fetch live orders from Amazon & Flipkart."}
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    onClick={handleSyncOrders}
                    className="px-4 py-2 rounded-xl bg-[#056468] text-white text-xs font-bold shadow hover:bg-[#045255]"
                  >
                    Sync Live Orders
                  </button>
                  {credentials.length === 0 && (
                    <button
                      onClick={handleSeedSample}
                      className="px-4 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold shadow hover:bg-amber-600"
                    >
                      Load Demo Orders
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order) => {
                  const isAmazon = order.channel === "AMAZON";
                  const isUnshipped = order.orderStatus === "UNSHIPPED" || order.orderStatus === "PENDING";
                  const isShipped = order.orderStatus === "SHIPPED";

                  return (
                    <div
                      key={order.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 hover:border-slate-300 transition-all space-y-3"
                    >
                      {/* Order Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          {/* Channel Badge */}
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                              isAmazon
                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                : "bg-blue-100 text-blue-900 border border-blue-300"
                            }`}
                          >
                            {isAmazon ? "Amazon SP-API" : "Flipkart"}
                          </span>

                          <span className="font-mono font-bold text-sm text-slate-800">
                            #{order.channelOrderId}
                          </span>

                          <span className="text-xs text-slate-400">
                            {new Date(order.orderDate).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>

                        {/* Status & Actions */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              isUnshipped
                                ? "bg-rose-100 text-rose-800"
                                : isShipped
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {order.orderStatus}
                          </span>

                          <button
                            onClick={() => {
                              setShippingInvoiceModalData({
                                orderId: order.channelOrderId,
                                channel: order.channel as any,
                                orderDate: order.orderDate,
                                buyerName: order.buyerName || "Customer",
                                shippingAddress: order.shippingAddress || "India",
                                city: order.buyerCity || undefined,
                                state: order.buyerState || undefined,
                                pincode: order.buyerPincode || undefined,
                                courier: order.courier || undefined,
                                trackingNumber: order.trackingNumber || undefined,
                                totalAmount: order.totalAmount,
                                items: order.items.map((i) => ({
                                  title: i.title,
                                  sku: i.channelSku,
                                  asinOrFsn: i.asinOrFsn || undefined,
                                  quantity: i.quantity,
                                  unitPrice: i.itemPrice,
                                  total: i.itemPrice * i.quantity,
                                })),
                              });
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#056468] hover:bg-[#e3f2f5] text-[#056468] text-xs font-bold shadow-xs transition-all active:scale-95"
                            title="Print 100x150mm (4x6 inch) Amazon/Flipkart Parcel Shipping Label & Tax Invoice"
                          >
                            <Printer className="w-3.5 h-3.5 text-[#056468]" />
                            <span>Print 100×150mm Parcel Invoice</span>
                          </button>

                          {isUnshipped && (
                            <button
                              onClick={() => {
                                setFulfillModalOrder(order);
                                setSelectedOrderItem(order.items[0] || null);
                                setScannedBarcodeInput("");
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#056468] hover:bg-[#045255] text-white text-xs font-bold shadow transition-all active:scale-95"
                            >
                              <ScanBarcode className="w-3.5 h-3.5 text-emerald-200" />
                              <span>Pack & Scan Barcode</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Order Line Items & Shipping Details */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Line Items */}
                        <div className="lg:col-span-2 space-y-2">
                          {order.items.map((item) => (
                            <div
                              key={item.id}
                              className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-3"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate">{item.title}</div>
                                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1">
                                  <span>
                                    SKU: <strong className="text-slate-700 font-mono">{item.channelSku}</strong>
                                  </span>
                                  {item.asinOrFsn && (
                                    <span>
                                      {isAmazon ? "ASIN" : "FSN"}:{" "}
                                      <strong className="text-slate-700 font-mono">{item.asinOrFsn}</strong>
                                    </span>
                                  )}
                                  <span>
                                    Qty: <strong className="text-slate-800">{item.quantity}</strong>
                                  </span>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <div className="text-xs font-bold text-slate-900">
                                  ₹{(item.itemPrice * item.quantity).toLocaleString("en-IN")}
                                </div>
                                {item.scannedBarcode ? (
                                  <div className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 font-semibold mt-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>{item.scannedBarcode}</span>
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-amber-700 font-medium mt-1">
                                    Awaiting unit scan
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Buyer & Delivery Info */}
                        <div className="p-3 rounded-xl bg-[#f4fbfb] border border-cyan-100 text-xs space-y-1.5 flex flex-col justify-between">
                          <div>
                            <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                              Buyer & Delivery Details
                            </div>
                            <div className="font-semibold text-slate-900 mt-1">{order.buyerName || "Marketplace Customer"}</div>
                            <div className="text-slate-600 text-[11px] leading-relaxed">
                              {order.shippingAddress || `${order.buyerCity || ""}, ${order.buyerState || ""}`}
                            </div>
                          </div>

                          <div className="border-t border-cyan-200/60 pt-2 flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-600">Total Paid:</span>
                            <span className="text-[#056468] text-sm">₹{order.totalAmount.toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INVENTORY STOCK PUSH MATRIX */}
        {activeTab === "inventory" && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Live Inventory Stock Push Matrix</h3>
                <p className="text-xs text-slate-500">
                  Pushes physical available Code 128 barcode unit stock from your warehouse directly to Amazon SP-API and Flipkart Marketplace.
                </p>
              </div>

              <button
                onClick={() => handlePushStock()}
                disabled={isPushingStock}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#056468] hover:bg-[#045255] text-white font-bold text-xs shadow transition-all active:scale-95 disabled:opacity-75"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>{isPushingStock ? "Pushing Stock..." : "Push All to Channels"}</span>
              </button>
            </div>

            {mappings.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <Boxes className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <h4 className="text-sm font-bold text-slate-800">No SKU Mappings Configured</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Add SKU to ASIN/FSN mappings in the Mappings tab to enable automatic stock synchronization with Amazon and Flipkart.
                </p>
                <button
                  onClick={() => setActiveTab("mappings")}
                  className="mt-4 px-4 py-2 rounded-xl bg-[#056468] text-white text-xs font-bold shadow"
                >
                  Configure Mappings
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f4fbfb] border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Local Product & SKU</th>
                        <th className="py-3 px-4">Marketplace</th>
                        <th className="py-3 px-4">Channel SKU / ASIN / FSN</th>
                        <th className="py-3 px-4 text-center">Available Barcode Stock</th>
                        <th className="py-3 px-4 text-center">Channel Synced Stock</th>
                        <th className="py-3 px-4">Sync Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {mappings.map((m) => {
                        const isAmz = m.channel === "AMAZON";
                        const inSync = m.availableBarcodeStock === m.channelStock;

                        return (
                          <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{m.variantName}</div>
                              <div className="text-[10px] font-mono text-slate-500">Local SKU: {m.localSku}</div>
                            </td>

                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  isAmz ? "bg-amber-100 text-amber-900" : "bg-blue-100 text-blue-900"
                                }`}
                              >
                                {isAmz ? "Amazon" : "Flipkart"}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <div className="font-mono font-semibold text-slate-800">{m.channelSku}</div>
                              {m.externalId && (
                                <div className="text-[10px] text-slate-500">
                                  {isAmz ? "ASIN: " : "FSN: "}
                                  <span className="font-mono text-slate-700">{m.externalId}</span>
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-4 text-center">
                              <span className="inline-block px-2.5 py-1 rounded-full bg-emerald-100 text-[#056468] font-extrabold text-xs">
                                {m.availableBarcodeStock ?? 0} units
                              </span>
                            </td>

                            <td className="py-3 px-4 text-center">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-full font-bold text-xs ${
                                  inSync ? "bg-slate-100 text-slate-800" : "bg-amber-100 text-amber-900"
                                }`}
                              >
                                {m.channelStock} units
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                {m.syncStatus === "SYNCED" ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                                )}
                                <span className="font-semibold text-[11px] text-slate-700">{m.syncStatus}</span>
                              </div>
                              {m.lastStockPushAt && (
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {new Date(m.lastStockPushAt).toLocaleTimeString("en-IN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </div>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => handlePushStock(m.id)}
                                disabled={isPushingStock}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-[#056468] hover:text-white text-slate-700 text-[11px] font-bold transition-all disabled:opacity-50"
                              >
                                <Zap className="w-3 h-3" />
                                <span>Push Live</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SKU ↔ ASIN/FSN MAPPINGS */}
        {activeTab === "mappings" && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">SKU to ASIN & FSN Mappings</h3>
                <p className="text-xs text-slate-500">
                  Connect your local warehouse product variants with Amazon ASINs and Flipkart FSNs.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingMapping({
                    channel: "AMAZON",
                    fulfillmentType: "FBM",
                    listingPrice: 0,
                  });
                  setIsMappingModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#056468] hover:bg-[#045255] text-white font-bold text-xs shadow transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add SKU Mapping</span>
              </button>
            </div>

            {mappings.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <Tag className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <h4 className="text-sm font-bold text-slate-800">No Mappings Yet</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Map your local product inventory with your Amazon Seller SKU / ASIN and Flipkart SKU / FSN.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mappings.map((m) => {
                  const isAmz = m.channel === "AMAZON";
                  return (
                    <div
                      key={m.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 hover:border-slate-300 transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              isAmz ? "bg-amber-100 text-amber-900" : "bg-blue-100 text-blue-900"
                            }`}
                          >
                            {isAmz ? "Amazon SP-API" : "Flipkart"}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">{m.fulfillmentType}</span>
                        </div>

                        <div>
                          <div className="text-xs font-bold text-slate-900">{m.variantName}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Channel SKU: <strong className="text-slate-800 font-mono">{m.channelSku}</strong>
                          </div>
                          {m.externalId && (
                            <div className="text-[11px] text-slate-500">
                              {isAmz ? "ASIN: " : "FSN: "}
                              <strong className="text-slate-800 font-mono">{m.externalId}</strong>
                            </div>
                          )}
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-500">Listing Price:</span>
                          <span className="font-bold text-slate-800">₹{m.listingPrice.toLocaleString("en-IN")}</span>
                        </div>
                      </div>

                      <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between">
                        <div className="text-[11px] text-slate-500 font-medium">
                          Available: <strong className="text-[#056468]">{m.availableBarcodeStock ?? 0} pcs</strong>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingMapping(m);
                              setIsMappingModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-[#056468] hover:bg-slate-100"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ type: "mapping", id: m.id, name: `Mapping for SKU ${m.channelSku}` })}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: API CREDENTIALS & INTEGRATION SETTINGS */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Amazon SP-API & Flipkart API Credentials</h3>
                <p className="text-xs text-slate-500">
                  Manage secure OAuth tokens, LWA Client Credentials, and webhook endpoints for automated sync.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingCredential({
                      channel: "AMAZON",
                      name: "Amazon India (Amazon.in)",
                      marketplaceId: "A21TJRUUN4KGV",
                      sandbox: false,
                      isActive: true,
                      autoSyncStock: true,
                      autoSyncOrders: true,
                    });
                    setIsCredentialModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Connect Amazon SP-API</span>
                </button>

                <button
                  onClick={() => {
                    setEditingCredential({
                      channel: "FLIPKART",
                      name: "Flipkart Seller Hub",
                      sandbox: false,
                      isActive: true,
                      autoSyncStock: true,
                      autoSyncOrders: true,
                    });
                    setIsCredentialModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition-all active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Connect Flipkart Hub</span>
                </button>
              </div>
            </div>

            {credentials.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <ShieldCheck className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <h4 className="text-sm font-bold text-slate-800">No Marketplace Accounts Connected</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Connect your Amazon SP-API and Flipkart seller accounts or generate sandbox demo accounts with 1 click to test order tracking and stock sync.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    onClick={handleSeedSample}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold shadow hover:bg-emerald-700"
                  >
                    Quick Setup Sandbox Accounts
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {credentials.map((cred) => {
                  const isAmz = cred.channel === "AMAZON";
                  return (
                    <div
                      key={cred.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 hover:border-slate-300 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                              isAmz ? "bg-amber-100 text-amber-900 border border-amber-300" : "bg-blue-100 text-blue-900 border border-blue-300"
                            }`}
                          >
                            {isAmz ? "AMZ" : "FK"}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{cred.name}</div>
                            <div className="text-[11px] text-slate-500">
                              {isAmz ? "Amazon SP-API (EU/India)" : "Flipkart Marketplace v3 API"}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            cred.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {cred.isActive ? "Active" : "Disabled"}
                        </span>
                      </div>

                      {/* Details Box */}
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-2 font-mono">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Seller Merchant ID:</span>
                          <span className="text-slate-800 font-bold">{cred.sellerId || "N/A"}</span>
                        </div>
                        {isAmz && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Marketplace ID:</span>
                            <span className="text-slate-800 font-bold">{cred.marketplaceId || "A21TJRUUN4KGV"}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">App / Client ID:</span>
                          <span className="text-slate-800 truncate max-w-[180px]">{cred.appId || "Configured"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Secret / Refresh Token:</span>
                          <span className="text-slate-500">{cred.refreshToken || cred.appSecret || "••••••••••••"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Mode:</span>
                          <span className={`font-bold ${cred.sandbox ? "text-amber-600" : "text-emerald-700"}`}>
                            {cred.sandbox ? "Sandbox / Mock Mode" : "Production"}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <button
                          onClick={() => handleTestConnection(cred)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all"
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span>Test Connection</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingCredential(cred);
                              setIsCredentialModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-[#056468] hover:bg-slate-100"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget({ type: "credential", id: cred.id, name: `${cred.name} (${cred.channel}) Channel` })}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL 1: CREDENTIAL EDIT / ADD */}
      {isCredentialModalOpen && editingCredential && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 relative z-[10000]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Store className="w-5 h-5 text-[#056468]" />
                <span>{editingCredential.id ? "Edit Channel Credentials" : "Connect Marketplace Channel"}</span>
              </h3>
              <button
                onClick={() => {
                  setIsCredentialModalOpen(false);
                  setEditingCredential(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCredential} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Marketplace Channel</label>
                <select
                  value={editingCredential.channel || "AMAZON"}
                  onChange={(e) =>
                    setEditingCredential({
                      ...editingCredential,
                      channel: e.target.value,
                      marketplaceId: e.target.value === "AMAZON" ? "A21TJRUUN4KGV" : null,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#056468]"
                >
                  <option value="AMAZON">Amazon India (SP-API / Selling Partner API)</option>
                  <option value="FLIPKART">Flipkart Marketplace Seller API</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Store / Account Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amazon India Main Store"
                  value={editingCredential.name || ""}
                  onChange={(e) => setEditingCredential({ ...editingCredential, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#056468]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Seller / Merchant ID</label>
                  <input
                    type="text"
                    placeholder="e.g. A3XXXXXXXXX"
                    value={editingCredential.sellerId || ""}
                    onChange={(e) => setEditingCredential({ ...editingCredential, sellerId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-[#056468]"
                  />
                </div>

                {editingCredential.channel === "AMAZON" ? (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Marketplace ID</label>
                    <input
                      type="text"
                      placeholder="A21TJRUUN4KGV (India)"
                      value={editingCredential.marketplaceId || "A21TJRUUN4KGV"}
                      onChange={(e) => setEditingCredential({ ...editingCredential, marketplaceId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-[#056468]"
                    />
                  </div>
                ) : null}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {editingCredential.channel === "AMAZON" ? "LWA App Client ID" : "Flipkart Application ID"}
                </label>
                <input
                  type="text"
                  placeholder="amzn1.application-oa2-client.xxxx or fk_app_id"
                  value={editingCredential.appId || ""}
                  onChange={(e) => setEditingCredential({ ...editingCredential, appId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-[#056468]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {editingCredential.channel === "AMAZON" ? "LWA Client Secret" : "Flipkart Application Secret"}
                </label>
                <input
                  type="password"
                  placeholder={editingCredential.id ? "Leave empty to keep existing secret" : "Client Secret"}
                  value={editingCredential.appSecret || ""}
                  onChange={(e) => setEditingCredential({ ...editingCredential, appSecret: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-[#056468]"
                />
              </div>

              {editingCredential.channel === "AMAZON" && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">LWA OAuth Refresh Token</label>
                  <textarea
                    rows={2}
                    placeholder={editingCredential.id ? "Leave empty to keep existing refresh token" : "Atzr|..."}
                    value={editingCredential.refreshToken || ""}
                    onChange={(e) => setEditingCredential({ ...editingCredential, refreshToken: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-[#056468]"
                  />
                </div>
              )}

              {/* API Environment Selection */}
              <div className="space-y-1.5 pt-1">
                <label className="block font-bold text-slate-800">
                  API Environment (Select Mode)
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingCredential({ ...editingCredential, sandbox: false })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      !(editingCredential.sandbox ?? false)
                        ? "bg-emerald-50 border-emerald-500 shadow-xs ring-2 ring-emerald-500/20"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Live Production API</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                      Connects directly to live {editingCredential.channel === "AMAZON" ? "Amazon Seller Central SP-API" : "Flipkart Marketplace"}.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingCredential({ ...editingCredential, sandbox: true })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      editingCredential.sandbox ?? false
                        ? "bg-amber-50 border-amber-500 shadow-xs ring-2 ring-amber-500/20"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      <span>Sandbox / Test Mode</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                      Developer testing mode using sandbox simulated endpoints.
                    </p>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingCredential.isActive ?? true}
                    onChange={(e) => setEditingCredential({ ...editingCredential, isActive: e.target.checked })}
                    className="rounded text-[#056468] focus:ring-[#056468]"
                  />
                  <span className="font-semibold text-slate-700">Account Active (Enable Sync)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCredentialModalOpen(false);
                    setEditingCredential(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#056468] text-white font-bold hover:bg-[#045255] shadow"
                >
                  Save Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SKU MAPPING EDIT / ADD */}
      {isMappingModalOpen && editingMapping && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 relative z-[10000]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#056468]" />
                <span>{editingMapping.id ? "Edit SKU Mapping" : "Map Local Product to Marketplace SKU"}</span>
              </h3>
              <button
                onClick={() => {
                  setIsMappingModalOpen(false);
                  setEditingMapping(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMapping} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Marketplace Channel</label>
                <select
                  required
                  value={editingMapping.credentialId || (credentials[0]?.id || "")}
                  onChange={(e) => {
                    const cred = credentials.find((c) => c.id === e.target.value);
                    setEditingMapping({
                      ...editingMapping,
                      credentialId: e.target.value,
                      channel: cred ? cred.channel : "AMAZON",
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#056468]"
                >
                  <option value="">-- Select Configured Marketplace --</option>
                  {credentials.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.channel})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Local Product Variant</label>
                <select
                  required
                  value={editingMapping.productVariantId || ""}
                  onChange={(e) => {
                    const v = variants.find((item) => item.id === e.target.value);
                    setEditingMapping({
                      ...editingMapping,
                      productVariantId: e.target.value,
                      channelSku: editingMapping.channelSku || v?.sku || "",
                      listingPrice: editingMapping.listingPrice || v?.sellingPrice || 0,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#056468]"
                >
                  <option value="">-- Select Product Variant --</option>
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} (Stock: {v.availableStock} pcs)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Marketplace Seller SKU</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MINI-CAM-1080P"
                    value={editingMapping.channelSku || ""}
                    onChange={(e) => setEditingMapping({ ...editingMapping, channelSku: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-[#056468]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {editingMapping.channel === "AMAZON" ? "Amazon ASIN" : "Flipkart FSN"}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. B09ABC1234 or FSNCAM99"
                    value={editingMapping.externalId || ""}
                    onChange={(e) => setEditingMapping({ ...editingMapping, externalId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-[#056468]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Listing Price (₹)</label>
                  <input
                    type="number"
                    step="any"
                    value={editingMapping.listingPrice || 0}
                    onChange={(e) => setEditingMapping({ ...editingMapping, listingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#056468]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fulfillment Mode</label>
                  <select
                    value={editingMapping.fulfillmentType || "FBM"}
                    onChange={(e) => setEditingMapping({ ...editingMapping, fulfillmentType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#056468]"
                  >
                    <option value="FBM">FBM / Smart Seller Fulfillment</option>
                    <option value="FBA">FBA / Flipkart Advantage</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsMappingModalOpen(false);
                    setEditingMapping(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#056468] text-white font-bold hover:bg-[#045255] shadow"
                >
                  Save Mapping
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DISPATCH & SCAN BARCODE MODAL */}
      {fulfillModalOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 relative z-[10000]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ScanBarcode className="w-5 h-5 text-[#056468]" />
                  <span>Pack & Scan Barcode Dispatch</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Order #{fulfillModalOrder.channelOrderId} ({fulfillModalOrder.channel})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShippingInvoiceModalData({
                      orderId: fulfillModalOrder.channelOrderId,
                      channel: fulfillModalOrder.channel as any,
                      orderDate: fulfillModalOrder.orderDate,
                      buyerName: fulfillModalOrder.buyerName || "Customer",
                      shippingAddress: fulfillModalOrder.shippingAddress || "India",
                      city: fulfillModalOrder.buyerCity || undefined,
                      state: fulfillModalOrder.buyerState || undefined,
                      pincode: fulfillModalOrder.buyerPincode || undefined,
                      courier: fulfillModalOrder.courier || undefined,
                      trackingNumber: fulfillModalOrder.trackingNumber || undefined,
                      totalAmount: fulfillModalOrder.totalAmount,
                      items: fulfillModalOrder.items.map((i) => ({
                        title: i.title,
                        sku: i.channelSku,
                        asinOrFsn: i.asinOrFsn || undefined,
                        quantity: i.quantity,
                        unitPrice: i.itemPrice,
                        total: i.itemPrice * i.quantity,
                      })),
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#056468] hover:bg-[#e3f2f5] text-[#056468] text-xs font-bold shadow-xs transition-all"
                  title="Print 100x150mm (4x6 inch) Parcel Shipping Label & Invoice"
                >
                  <Printer className="w-3.5 h-3.5 text-[#056468]" />
                  <span>Print 100×150mm Label</span>
                </button>
                <button
                  onClick={() => {
                    setFulfillModalOrder(null);
                    setSelectedOrderItem(null);
                    setScannedBarcodeInput("");
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Items List */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700">Select Item to Pack:</label>
                {fulfillModalOrder.items.map((item) => {
                  const isSelected = selectedOrderItem?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedOrderItem(item)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-[#f4fbfb] border-[#056468] shadow-sm"
                          : "bg-slate-50 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-900">{item.title}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          SKU: {item.channelSku} • Qty: {item.quantity}
                        </div>
                      </div>

                      {item.scannedBarcode ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-mono text-[11px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{item.scannedBarcode}</span>
                        </span>
                      ) : (
                        <span className="text-amber-700 font-semibold text-[11px]">Pending Scan</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Barcode Scan Input */}
              <form onSubmit={handleFulfillScan} className="space-y-3 pt-2">
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                  <div className="font-bold mb-1 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-emerald-600" />
                    <span>Scan Physical Unit Code 128 Barcode</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Point your USB / Bluetooth barcode scanner at the product item label or enter the unit barcode (e.g. BAR-...) below:
                  </p>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Scan or enter barcode (e.g. BAR-0001)..."
                    value={scannedBarcodeInput}
                    onChange={(e) => setScannedBarcodeInput(e.target.value)}
                    className="w-full pl-3 pr-24 py-3 rounded-xl border-2 border-[#056468] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 font-bold"
                  />
                  <button
                    type="submit"
                    disabled={isFulfilling || !scannedBarcodeInput}
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-lg bg-[#056468] text-white font-bold text-xs shadow hover:bg-[#045255] transition-all disabled:opacity-50"
                  >
                    {isFulfilling ? "Verifying..." : "Verify & Deduct"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: 100x150mm SHIPPING INVOICE PRINT MODAL */}
      {shippingInvoiceModalData && (
        <PrintShippingInvoiceDialog
          isOpen={!!shippingInvoiceModalData}
          onClose={() => setShippingInvoiceModalData(null)}
          data={shippingInvoiceModalData}
        />
      )}

      {/* Safety Delete Confirmation Modal for Marketplace Items */}
      <DeleteConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title={deleteTarget?.type === "credential" ? "Remove Marketplace Channel" : "Delete SKU Mapping"}
        itemName={deleteTarget?.name || ""}
        confirmKeyword="RESET"
      />
    </div>
  );
}
