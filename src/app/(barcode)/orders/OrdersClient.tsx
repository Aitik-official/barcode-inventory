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
  User,
  MapPin,
  Phone,
  Building,
  Building2,
  Save,
  Eye,
  Edit3,
  ChevronDown,
  Check,
  RefreshCw,
  Copy,
  CreditCard,
  Sparkles,
  SlidersHorizontal,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import {
  PrintShippingInvoiceDialog,
  ShippingInvoiceData,
} from "@/components/PrintShippingInvoiceDialog";
import { Pagination } from "@/components/Pagination";
import { CompanySettingsData, DEFAULT_COMPANY_SETTINGS } from "@/lib/companySettingsTypes";

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
  company?: string;
  gstin?: string;
  totalAmount: number;
  status: string;
  createdAt: string | Date;
  trackingNumber?: string;
  courier?: string;
  customerId?: string | null;
  notes?: string;
  isMarketplace?: boolean;
  items: Array<{
    title: string;
    sku: string;
    asinOrFsn?: string;
    unitBarcode?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  rawOrder?: any;
}

const ORDER_STATUS_OPTIONS = [
  { value: "Order Placed", label: "Order Placed", color: "bg-slate-100 text-slate-800 border-slate-300" },
  { value: "UNSHIPPED", label: "Unshipped", color: "bg-amber-100 text-amber-900 border-amber-300" },
  { value: "Confirmed", label: "Confirmed", color: "bg-cyan-100 text-cyan-900 border-cyan-300" },
  { value: "Processing", label: "Processing", color: "bg-indigo-100 text-indigo-900 border-indigo-300" },
  { value: "Shipped", label: "Shipped", color: "bg-blue-100 text-blue-900 border-blue-300" },
  { value: "Delivered", label: "Delivered", color: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  { value: "Cancelled", label: "Cancelled", color: "bg-rose-100 text-rose-900 border-rose-300" },
  { value: "Returned", label: "Returned", color: "bg-purple-100 text-purple-900 border-purple-300" },
];

export default function OrdersClient({
  orders = [],
  marketplaceOrders = [],
  quotations = [],
  enquiries = [],
  invoices = [],
  customers = [],
  initialCompanySettings,
}: {
  orders: any[];
  marketplaceOrders?: any[];
  quotations: any[];
  enquiries: any[];
  invoices: any[];
  customers: any[];
  initialCompanySettings?: CompanySettingsData;
}) {
  const [activeTab, setActiveTab] = useState<"orders" | "quotations" | "enquiries" | "invoices" | "settings">("orders");
  const [channelBatchFilter, setChannelBatchFilter] = useState<"ALL" | "WEBSITE" | "AMAZON" | "FLIPKART" | "POS">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [shippingInvoiceData, setShippingInvoiceData] = useState<ShippingInvoiceData | null>(null);
  const [invoiceModalMode, setInvoiceModalMode] = useState<"A4_INVOICE" | "THERMAL_LABEL">("A4_INVOICE");

  // Company and Invoice Customization Settings State
  const [companySettings, setCompanySettings] = useState<CompanySettingsData>(
    initialCompanySettings || DEFAULT_COMPANY_SETTINGS
  );
  const [isSavingCompanySettings, setIsSavingCompanySettings] = useState(false);
  const [companySettingsFeedback, setCompanySettingsFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Local state for orders allowing real-time status & customer changes
  const [localOrders, setLocalOrders] = useState<any[]>(orders);
  const [localMarketplaceOrders, setLocalMarketplaceOrders] = useState<any[]>(marketplaceOrders);
  const [localCustomers, setLocalCustomers] = useState<any[]>(customers);

  // Selected Order for Details Modal
  const [selectedDetailOrder, setSelectedDetailOrder] = useState<UnifiedOrder | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [detailModalFeedback, setDetailModalFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Editable fields in Details Modal
  const [editStatus, setEditStatus] = useState<string>("");
  const [editCourier, setEditCourier] = useState<string>("");
  const [editTrackingNumber, setEditTrackingNumber] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [editCustomerPhone, setEditCustomerPhone] = useState<string>("");
  const [editCustomerEmail, setEditCustomerEmail] = useState<string>("");
  const [editShippingAddress, setEditShippingAddress] = useState<string>("");

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

  // Double Verification Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    orders: UnifiedOrder[];
    isBatch: boolean;
    isDemoReset?: boolean;
  } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState<string | null>(null);

  const handleOpenDeleteModal = (ord: UnifiedOrder) => {
    setDeleteModal({
      open: true,
      orders: [ord],
      isBatch: false,
    });
    setDeleteConfirmText("");
    setDeleteFeedback(null);
  };

  const handleOpenBatchDeleteModal = () => {
    const selected = unifiedOrders.filter((o) => selectedOrderIds.includes(o.id));
    if (selected.length === 0) return;
    setDeleteModal({
      open: true,
      orders: selected,
      isBatch: true,
    });
    setDeleteConfirmText("");
    setDeleteFeedback(null);
  };

  const handleOpenDemoResetModal = () => {
    setDeleteModal({
      open: true,
      orders: unifiedOrders,
      isBatch: true,
      isDemoReset: true,
    });
    setDeleteConfirmText("");
    setDeleteFeedback(null);
  };

  const handleExecuteDelete = async () => {
    if (!deleteModal) return;
    setIsDeleting(true);
    setDeleteFeedback(null);

    try {
      if (deleteModal.isDemoReset) {
        const res = await fetch("/api/admin/reset-demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "CLEAR_TRANSACTIONS",
            confirmText: "RESET",
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to clear demo data");

        setLocalOrders([]);
        setLocalMarketplaceOrders([]);
        setSelectedOrderIds([]);
        setDeleteModal(null);
        alert("✅ All demo/test sales data, orders, and invoices have been cleared successfully!");
        window.location.reload();
        return;
      }

      const orderIdsToDelete = deleteModal.orders.map((o) => o.id);
      const res = await fetch("/api/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: orderIdsToDelete }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete order(s)");

      // Remove from local state
      setLocalOrders((prev) =>
        prev.filter((o) => !orderIdsToDelete.includes(o.id) && !orderIdsToDelete.includes(o.orderNumber))
      );
      setLocalMarketplaceOrders((prev) =>
        prev.filter((o) => !orderIdsToDelete.includes(o.id) && !orderIdsToDelete.includes(o.channelOrderId))
      );
      setSelectedOrderIds((prev) => prev.filter((id) => !orderIdsToDelete.includes(id)));

      setDeleteModal(null);
    } catch (err: any) {
      setDeleteFeedback(err.message || "Failed to execute deletion.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Unify standard orders and marketplace orders
  const unifiedOrders: UnifiedOrder[] = useMemo(() => {
    const list: UnifiedOrder[] = [];

    // 1. Local Orders (Website / POS / Direct / Multi-Channel)
    localOrders.forEach((ord) => {
      let detectedChannel: "AMAZON" | "FLIPKART" | "WEBSITE" | "POS" = "WEBSITE";
      if (ord.orderNumber?.startsWith("AMZ-") || ord.notes?.includes("Channel: AMAZON")) {
        detectedChannel = "AMAZON";
      } else if (ord.orderNumber?.startsWith("FK-") || ord.notes?.includes("Channel: FLIPKART")) {
        detectedChannel = "FLIPKART";
      } else if (
        ord.orderNumber?.startsWith("POS-") ||
        ord.notes?.includes("Channel: POS") ||
        ord.customerName?.toLowerCase().includes("walk-in")
      ) {
        detectedChannel = "POS";
      } else if (ord.orderNumber?.startsWith("WEB-") || ord.notes?.includes("Channel: WEBSITE")) {
        detectedChannel = "WEBSITE";
      }

      const isPos = detectedChannel === "POS";
      const orderItems = (ord.items || []).map((i: any) => ({
        title: i.name || i.productVariant?.product?.name || "Inventory Product",
        sku: i.sku || i.productVariant?.sku || "PROD",
        unitBarcode: i.unitBarcode?.barcode || undefined,
        quantity: i.quantity || 1,
        unitPrice: i.unitPrice || 0,
        totalPrice: i.totalPrice || (i.quantity || 1) * (i.unitPrice || 0),
      }));

      // Extract tracking and courier from notes if present
      let extractedTracking = "";
      let extractedCourier = "";
      if (ord.notes) {
        const trkMatch = ord.notes.match(/AWB:\s*([^\s|]+)/i);
        if (trkMatch) extractedTracking = trkMatch[1];
        const courMatch = ord.notes.match(/Courier:\s*([^\s|]+)/i);
        if (courMatch) extractedCourier = courMatch[1];
      }

      list.push({
        id: ord.id,
        orderNumber: ord.orderNumber,
        channel: detectedChannel,
        customerName: ord.customerName || (isPos ? "Walk-in Retail Customer" : "Store Customer"),
        customerEmail: ord.customerEmail || "",
        customerPhone: ord.customerPhone || "",
        shippingAddress: ord.shippingAddress || (isPos ? "Local Store Pickup" : "Direct Dispatch"),
        company: ord.company || undefined,
        gstin: ord.gstin || undefined,
        totalAmount: ord.totalAmount || 0,
        status: ord.status || "CONFIRMED",
        createdAt: ord.createdAt,
        trackingNumber: extractedTracking || undefined,
        courier: extractedCourier || (isPos ? "Store Counter" : undefined),
        customerId: ord.customerId,
        notes: ord.notes || "",
        isMarketplace: false,
        items: orderItems,
        rawOrder: ord,
      });
    });

    // 2. Marketplace Orders (Amazon SP-API & Flipkart)
    localMarketplaceOrders.forEach((mord) => {
      const isAmazon = mord.channel === "AMAZON";
      list.push({
        id: mord.id,
        orderNumber: mord.channelOrderId,
        channel: isAmazon ? "AMAZON" : "FLIPKART",
        customerName: mord.buyerName || (isAmazon ? "Amazon Customer" : "Flipkart Buyer"),
        shippingAddress:
          mord.shippingAddress ||
          `${mord.buyerCity || ""}, ${mord.buyerState || ""} - ${mord.buyerPincode || ""}`.trim() ||
          "Marketplace Logistics",
        buyerCity: mord.buyerCity,
        buyerState: mord.buyerState,
        buyerPincode: mord.buyerPincode,
        totalAmount: mord.totalAmount || 0,
        status: mord.orderStatus || "UNSHIPPED",
        createdAt: mord.orderDate || mord.createdAt,
        trackingNumber: mord.trackingNumber || undefined,
        courier: mord.courier || (isAmazon ? "Amazon ATS Express" : "Ekart Logistics"),
        notes: `Marketplace Order [${mord.channel}] — Fulfillment: ${mord.fulfillmentChannel || "MERCHANT"}`,
        isMarketplace: true,
        items: (mord.items || []).map((i: any) => ({
          title: i.title || "Marketplace Product",
          sku: i.channelSku || "SKU",
          asinOrFsn: i.asinOrFsn || undefined,
          unitBarcode: i.scannedBarcode || undefined,
          quantity: i.quantity || 1,
          unitPrice: i.itemPrice || 0,
          totalPrice: (i.itemPrice || 0) * (i.quantity || 1),
        })),
        rawOrder: mord,
      });
    });

    // Sort newest first
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [localOrders, localMarketplaceOrders]);

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
        const matchesSku = ord.items.some(
          (i) => i.sku.toLowerCase().includes(q) || (i.asinOrFsn || "").toLowerCase().includes(q)
        );
        if (!matchesNum && !matchesCust && !matchesTracking && !matchesSku) {
          return false;
        }
      }
      return true;
    });
  }, [unifiedOrders, channelBatchFilter, statusFilter, searchQuery]);

  // Pagination States
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPageSize, setOrdersPageSize] = useState(10);

  const [quoPage, setQuoPage] = useState(1);
  const [quoPageSize, setQuoPageSize] = useState(10);

  const [enqPage, setEnqPage] = useState(1);
  const [enqPageSize, setEnqPageSize] = useState(10);

  const [invPage, setInvPage] = useState(1);
  const [invPageSize, setInvPageSize] = useState(10);

  // Paginated Data Slices
  const paginatedOrders = useMemo(() => {
    const start = (ordersPage - 1) * ordersPageSize;
    return filteredOrders.slice(start, start + ordersPageSize);
  }, [filteredOrders, ordersPage, ordersPageSize]);

  const paginatedQuotations = useMemo(() => {
    const start = (quoPage - 1) * quoPageSize;
    return quotations.slice(start, start + quoPageSize);
  }, [quotations, quoPage, quoPageSize]);

  const paginatedEnquiries = useMemo(() => {
    const start = (enqPage - 1) * enqPageSize;
    return enquiries.slice(start, start + enqPageSize);
  }, [enquiries, enqPage, enqPageSize]);

  const paginatedInvoices = useMemo(() => {
    const start = (invPage - 1) * invPageSize;
    return invoices.slice(start, start + invPageSize);
  }, [invoices, invPage, invPageSize]);

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

  // Open Order Details Modal
  const handleOpenOrderDetail = (ord: UnifiedOrder) => {
    setSelectedDetailOrder(ord);
    setEditStatus(ord.status);
    setEditCourier(ord.courier || "");
    setEditTrackingNumber(ord.trackingNumber || "");
    setEditNotes(ord.notes || "");
    setEditCustomerPhone(ord.customerPhone || "");
    setEditCustomerEmail(ord.customerEmail || "");
    setEditShippingAddress(ord.shippingAddress || "");
    setDetailModalFeedback(null);
  };

  // Fast direct status update (from row or modal)
  const handleDirectStatusChange = async (ord: UnifiedOrder, newStatus: string) => {
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: ord.id,
          orderNumber: ord.orderNumber,
          status: newStatus,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }

      // Update local state directly
      if (ord.isMarketplace) {
        setLocalMarketplaceOrders((prev) =>
          prev.map((m) => (m.id === ord.id || m.channelOrderId === ord.orderNumber ? { ...m, orderStatus: newStatus } : m))
        );
      } else {
        setLocalOrders((prev) =>
          prev.map((o) => (o.id === ord.id || o.orderNumber === ord.orderNumber ? { ...o, status: newStatus } : o))
        );
      }

      if (selectedDetailOrder && selectedDetailOrder.id === ord.id) {
        setSelectedDetailOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
        setEditStatus(newStatus);
        setDetailModalFeedback({ type: "success", text: `Order status changed to "${newStatus}"!` });
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Save all edited order & customer details
  const handleSaveOrderDetails = async (saveCustomerFlag: boolean = false) => {
    if (!selectedDetailOrder) return;
    setIsUpdatingStatus(true);
    setDetailModalFeedback(null);

    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedDetailOrder.id,
          orderNumber: selectedDetailOrder.orderNumber,
          status: editStatus,
          courier: editCourier,
          trackingNumber: editTrackingNumber,
          notes: editNotes,
          customerPhone: editCustomerPhone,
          customerEmail: editCustomerEmail,
          shippingAddress: editShippingAddress,
          saveCustomer: saveCustomerFlag,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update order");
      }

      const result = await res.json();

      // Update local orders
      if (selectedDetailOrder.isMarketplace) {
        setLocalMarketplaceOrders((prev) =>
          prev.map((m) =>
            m.id === selectedDetailOrder.id
              ? {
                  ...m,
                  orderStatus: editStatus,
                  courier: editCourier,
                  trackingNumber: editTrackingNumber,
                  shippingAddress: editShippingAddress,
                }
              : m
          )
        );
      } else {
        setLocalOrders((prev) =>
          prev.map((o) =>
            o.id === selectedDetailOrder.id
              ? {
                  ...o,
                  status: editStatus,
                  customerPhone: editCustomerPhone,
                  customerEmail: editCustomerEmail,
                  shippingAddress: editShippingAddress,
                  notes: editNotes,
                  customerId: result.order?.customerId || o.customerId,
                }
              : o
          )
        );
      }

      // Update active selection
      setSelectedDetailOrder((prev) =>
        prev
          ? {
              ...prev,
              status: editStatus,
              courier: editCourier,
              trackingNumber: editTrackingNumber,
              customerPhone: editCustomerPhone,
              customerEmail: editCustomerEmail,
              shippingAddress: editShippingAddress,
              notes: editNotes,
              customerId: result.order?.customerId || prev.customerId,
            }
          : null
      );

      setDetailModalFeedback({
        type: "success",
        text: saveCustomerFlag
          ? "✅ Customer profile saved to Customer Directory & Order updated!"
          : "✅ Order details & status updated successfully!",
      });
    } catch (err: any) {
      setDetailModalFeedback({ type: "error", text: err.message || "Failed to save details" });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

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
      shippingAddress:
        (selected.length === 1 ? first.shippingAddress : "Multiple Delivery Addresses") || "Warehouse Dispatch",
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

  const handleSaveCompanySettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingCompanySettings(true);
    setCompanySettingsFeedback(null);
    try {
      const res = await fetch("/api/settings/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(companySettings),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save company settings");
      }

      const saved = await res.json();
      setCompanySettings(saved);
      setCompanySettingsFeedback({
        type: "success",
        text: "Company and invoice settings updated successfully! All printed tax invoices, shipping slips, and retail receipts will reflect these details.",
      });
      setTimeout(() => setCompanySettingsFeedback(null), 6000);
    } catch (err: any) {
      setCompanySettingsFeedback({
        type: "error",
        text: err.message || "Failed to update company settings",
      });
    } finally {
      setIsSavingCompanySettings(false);
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
            Real-time batch fulfillment for <strong>Website Storefront</strong>, <strong>Amazon SP-API</strong>,{" "}
            <strong>Flipkart Marketplace</strong> & <strong>POS Scanner</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-3.5 py-2 border font-medium text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all ${
              activeTab === "settings"
                ? "bg-[#056468] text-white border-[#056468]"
                : "bg-white border-[#cce7ed] hover:bg-[#e3f2f5] text-[#056468]"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Invoice & Company Settings</span>
          </button>

          <button
            onClick={() => setEnqModalOpen(true)}
            className="px-3.5 py-2 bg-white border border-[#cce7ed] hover:bg-[#e3f2f5] text-[#056468] font-medium text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Log Service Enquiry</span>
          </button>

          <button
            onClick={() => {
              setSelectedEnquiry(null);
              setQuoModalOpen(true);
            }}
            className="px-3.5 py-2 bg-[#056468] hover:bg-[#044e51] text-white font-medium text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Issue B2B Quotation</span>
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab("orders")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === "orders"
              ? "border-[#056468] text-[#056468]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Fulfillment Orders ({unifiedOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("quotations")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === "quotations"
              ? "border-[#056468] text-[#056468]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>B2B Quotations ({quotations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("enquiries")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === "enquiries"
              ? "border-[#056468] text-[#056468]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Service Enquiries ({enquiries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("invoices")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === "invoices"
              ? "border-[#056468] text-[#056468]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>GST Tax Invoices ({invoices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`pb-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === "settings"
              ? "border-[#056468] text-[#056468]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Invoice & Company Settings</span>
        </button>
      </div>

      {/* TAB 1: UNIFIED ORDERS & MULTI-CHANNEL BATCH */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          {/* Top Channel Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* All Orders Batch */}
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
                <ShoppingBag className="w-3.5 h-3.5 text-[#056468]" />
              </div>
              <div className="text-xl font-extrabold text-slate-900">{batchCounts.all}</div>
              <div className="text-[11px] font-bold text-slate-500 mt-0.5">
                ₹{batchCounts.allAmount.toLocaleString("en-IN")} Total
              </div>
            </div>

            {/* Website Batch */}
            <div
              onClick={() => setChannelBatchFilter("WEBSITE")}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                channelBatchFilter === "WEBSITE"
                  ? "bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
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
                  <option value="ORDER PLACED">Order Placed</option>
                  <option value="UNSHIPPED">Unshipped</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="SHIPPED">Shipped</option>
                  <option value="DELIVERED">Delivered</option>
                  <option value="CANCELLED">Cancelled</option>
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
                    className="px-3.5 py-1.5 rounded-lg bg-[#056468] hover:bg-[#044e51] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Batch Print 100×150mm Shipping Invoices</span>
                  </button>

                  <button
                    onClick={handleOpenBatchDeleteModal}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Delete all selected orders with double verification"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete Selected ({selectedOrderIds.length})</span>
                  </button>

                  <button
                    onClick={() => setSelectedOrderIds([])}
                    className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                  >
                    Deselect
                  </button>
                </div>
              </div>
            )}

            {/* Orders Table */}
            <div className="overflow-x-auto rounded-xl border border-[#cce7ed]">
              <table className="w-full text-left text-xs table-auto">
                <thead className="bg-[#f2f9fa] text-[#0b252c] font-semibold uppercase tracking-wider border-b border-[#cce7ed]">
                  <tr>
                    <th className="py-2.5 px-2 w-7 text-center">
                      <button
                        type="button"
                        onClick={selectAllFiltered}
                        className="text-slate-500 hover:text-slate-800 inline-flex items-center justify-center"
                        title="Select All Filtered"
                      >
                        {selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-[#056468]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="py-2.5 px-2 whitespace-nowrap">Channel</th>
                    <th className="py-2.5 px-2 whitespace-nowrap">Order ID / Date</th>
                    <th className="py-2.5 px-2">Buyer & Details</th>
                    <th className="py-2.5 px-2">Items & SKUs</th>
                    <th className="py-2.5 px-2 whitespace-nowrap">Amount</th>
                    <th className="py-2.5 px-2 whitespace-nowrap">Status</th>
                    <th className="py-2.5 px-2 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 font-sans">
                        No orders matching current batch filter (<strong>{channelBatchFilter}</strong>).
                      </td>
                    </tr>
                  ) : (
                    paginatedOrders.map((ord) => {
                      const isSelected = selectedOrderIds.includes(ord.id);
                      const existingInv = invoiceMap[ord.id] || invoiceMap[ord.orderNumber];

                      const currentStatusColor =
                        ord.status === "SHIPPED" || ord.status === "DELIVERED"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : ord.status === "UNSHIPPED" || ord.status === "PENDING"
                          ? "bg-amber-50 text-amber-900 border-amber-300"
                          : ord.status === "CONFIRMED"
                          ? "bg-cyan-50 text-cyan-900 border-cyan-300"
                          : ord.status === "PROCESSING"
                          ? "bg-indigo-50 text-indigo-900 border-indigo-300"
                          : ord.status === "CANCELLED"
                          ? "bg-rose-50 text-rose-900 border-rose-300"
                          : "bg-slate-50 text-slate-800 border-slate-300";

                      return (
                        <tr
                          key={ord.id}
                          className={`transition-colors ${
                            isSelected ? "bg-[#e3f2f5]/50" : "hover:bg-slate-50/80"
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => toggleSelectOrder(ord.id)}
                              className="text-slate-400 hover:text-slate-700 inline-flex items-center justify-center"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-[#056468]" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          {/* Channel Badge */}
                          <td className="py-2.5 px-2 whitespace-nowrap">
                            {ord.channel === "AMAZON" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                                <Store className="w-3 h-3 text-amber-600" />
                                <span>Amazon</span>
                              </span>
                            ) : ord.channel === "FLIPKART" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-900 border border-blue-300">
                                <PackageCheck className="w-3 h-3 text-blue-600" />
                                <span>Flipkart</span>
                              </span>
                            ) : ord.channel === "POS" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-900 border border-purple-300">
                                <QrCode className="w-3 h-3 text-purple-600" />
                                <span>POS Scan</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-900 border border-emerald-300">
                                <Globe className="w-3 h-3 text-emerald-700" />
                                <span>Website</span>
                              </span>
                            )}
                          </td>

                          {/* Order ID & Date */}
                          <td className="py-2.5 px-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleOpenOrderDetail(ord)}
                              className="font-mono text-xs text-[#056468] hover:text-[#044e51] font-bold block text-left hover:underline truncate max-w-[135px]"
                              title={`Click to view complete order ${ord.orderNumber}`}
                            >
                              {ord.orderNumber}
                            </button>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {new Date(ord.createdAt).toLocaleDateString()}
                            </span>
                            {existingInv && (
                              <button
                                type="button"
                                onClick={() => setActiveTab("invoices")}
                                className="mt-0.5 inline-flex items-center gap-1 text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded hover:bg-emerald-100 transition-colors cursor-pointer"
                                title="Click to view in Invoices Tab"
                              >
                                <Receipt className="w-2.5 h-2.5 text-emerald-600" />
                                <span>{existingInv.invoiceNumber}</span>
                              </button>
                            )}
                          </td>

                          {/* Buyer & Destination */}
                          <td className="py-2.5 px-2 max-w-[150px]">
                            <button
                              type="button"
                              onClick={() => handleOpenOrderDetail(ord)}
                              className="font-semibold text-slate-900 block truncate text-left hover:text-[#056468] hover:underline"
                              title={ord.customerName}
                            >
                              {ord.customerName}
                            </button>
                            <span className="text-[10.5px] text-slate-500 block truncate" title={ord.shippingAddress}>
                              {ord.shippingAddress}
                            </span>
                            {ord.customerPhone && (
                              <span className="text-[9.5px] text-slate-400 font-mono block">
                                {ord.customerPhone}
                              </span>
                            )}
                          </td>

                          {/* Items & SKU */}
                          <td className="py-2.5 px-2 max-w-[210px]">
                            <div className="space-y-1">
                              {ord.items.slice(0, 2).map((itm, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 whitespace-nowrap text-[11px] leading-tight">
                                  <span className="font-bold text-[#056468] shrink-0 text-[10.5px]">{itm.quantity}x</span>
                                  <span
                                    className="font-mono font-semibold text-slate-800 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] truncate max-w-[110px] inline-block shrink-0"
                                    title={itm.sku || itm.title}
                                  >
                                    {itm.sku || itm.title}
                                  </span>
                                  {itm.asinOrFsn && (
                                    <span
                                      className="text-[9px] font-mono font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 truncate max-w-[85px] inline-block shrink-0"
                                      title={`ASIN/FSN: ${itm.asinOrFsn}`}
                                    >
                                      {itm.asinOrFsn}
                                    </span>
                                  )}
                                  {itm.unitBarcode && (
                                    <span
                                      className="text-[9px] font-mono font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 truncate max-w-[85px] inline-block shrink-0"
                                      title={`Barcode: ${itm.unitBarcode}`}
                                    >
                                      {itm.unitBarcode}
                                    </span>
                                  )}
                                </div>
                              ))}
                              {ord.items.length > 2 && (
                                <span className="text-[9.5px] text-slate-400 italic block">
                                  +{ord.items.length - 2} more item(s)
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="py-2.5 px-2 whitespace-nowrap font-mono font-bold text-slate-900 text-xs">
                            ₹{ord.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>

                          {/* Status - Interactive Selector */}
                          <td className="py-2.5 px-2 whitespace-nowrap">
                            <div className="space-y-0.5">
                              <select
                                value={ord.status}
                                onChange={(e) => handleDirectStatusChange(ord, e.target.value)}
                                className={`px-2 py-1 rounded-md text-[10.5px] font-bold border cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#056468] ${currentStatusColor}`}
                              >
                                {ORDER_STATUS_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>

                              {ord.trackingNumber && (
                                <span className="text-[9.5px] font-mono text-slate-500 flex items-center gap-1">
                                  <Truck className="w-2.5 h-2.5 text-slate-400" />
                                  <span className="truncate max-w-[95px]" title={ord.trackingNumber}>{ord.trackingNumber}</span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-2.5 px-2 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1 flex-nowrap">
                              {/* View / Edit Details Modal */}
                              <button
                                type="button"
                                onClick={() => handleOpenOrderDetail(ord)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-md inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                                title="View Complete Customer & Order Details"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                <span>Details</span>
                              </button>

                              {/* Full A4 GST Tax Invoice Option */}
                              <button
                                type="button"
                                onClick={() => handleOpenSingleInvoice(ord, "A4_INVOICE")}
                                className="px-2 py-1 bg-[#056468] hover:bg-[#044e51] text-white font-semibold text-[11px] rounded-md shadow-2xs inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                                title="View & Print Full Professional A4 GST Tax Invoice"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Tax Invoice</span>
                              </button>

                              {/* 100x150mm Thermal Shipping Label Option */}
                              <button
                                type="button"
                                onClick={() => handleOpenSingleInvoice(ord, "THERMAL_LABEL")}
                                className="px-2 py-1 bg-white border border-[#cce7ed] hover:bg-[#f0f8fa] text-[#056468] font-semibold text-[11px] rounded-md shadow-2xs inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
                                title="Print 100x150mm (4x6) Thermal Courier Shipping Label"
                              >
                                <Printer className="w-3.5 h-3.5 text-[#056468]" />
                                <span>100×150mm</span>
                              </button>

                              {/* Delete Order Option */}
                              <button
                                type="button"
                                onClick={() => handleOpenDeleteModal(ord)}
                                className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors shrink-0 cursor-pointer ml-0.5"
                                title="Delete Order (Double Verification)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              <Pagination
                currentPage={ordersPage}
                totalItems={filteredOrders.length}
                pageSize={ordersPageSize}
                onPageChange={setOrdersPage}
                onPageSizeChange={setOrdersPageSize}
                itemLabel="orders"
              />
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
                  paginatedQuotations.map((q) => (
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
                      <td className="p-3.5 text-slate-500">{q.notes || "—"}</td>
                      <td className="p-3.5 text-slate-500">{new Date(q.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <Pagination
              currentPage={quoPage}
              totalItems={quotations.length}
              pageSize={quoPageSize}
              onPageChange={setQuoPage}
              onPageSizeChange={setQuoPageSize}
              itemLabel="quotations"
            />
          </div>
        </div>
      )}

      {/* TAB 3: SERVICE ENQUIRIES */}
      {activeTab === "enquiries" && (
        <div className="bg-white border border-[#cce7ed] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-semibold text-[#0b252c] flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#056468]" />
                Customer Service & Custom Print Enquiries
              </h2>
              <p className="text-xs text-slate-500">
                Inbound customer requests for custom thermal label sizes, barcode templates & printing.
              </p>
            </div>
            <button
              onClick={() => setEnqModalOpen(true)}
              className="px-4 py-2 bg-[#056468] hover:bg-[#044e51] text-white font-medium text-xs rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              New Enquiry
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#cce7ed]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f2f9fa] text-[#0b252c] font-semibold uppercase tracking-wider border-b border-[#cce7ed]">
                <tr>
                  <th className="p-3.5">Customer Name</th>
                  <th className="p-3.5">Phone</th>
                  <th className="p-3.5">Service Requested</th>
                  <th className="p-3.5">Message / Specifications</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {enquiries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">
                      No customer enquiries logged yet.
                    </td>
                  </tr>
                ) : (
                  paginatedEnquiries.map((enq) => (
                    <tr key={enq.id} className="hover:bg-slate-50/70">
                      <td className="p-3.5 font-medium text-[#0b252c]">{enq.name}</td>
                      <td className="p-3.5 text-slate-500 font-mono">{enq.phone || "—"}</td>
                      <td className="p-3.5 font-medium text-[#056468]">{enq.itemName}</td>
                      <td className="p-3.5 text-slate-600 max-w-xs truncate">{enq.message}</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-cyan-50 text-cyan-800 border border-cyan-200">
                          {enq.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500">{new Date(enq.createdAt).toLocaleDateString()}</td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedEnquiry(enq);
                            setQuoNotes(`In response to enquiry for: ${enq.itemName} (${enq.message})`);
                            setQuoModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-[#056468] hover:bg-[#044e51] text-white font-medium text-xs rounded-lg shadow-xs flex items-center gap-1 ml-auto"
                        >
                          <ArrowRight className="w-3 h-3" />
                          <span>Issue Quotation</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <Pagination
              currentPage={enqPage}
              totalItems={enquiries.length}
              pageSize={enqPageSize}
              onPageChange={setEnqPage}
              onPageSizeChange={setEnqPageSize}
              itemLabel="enquiries"
            />
          </div>
        </div>
      )}

      {/* TAB 4: TAX INVOICES */}
      {activeTab === "invoices" && (
        <div className="bg-white border border-[#cce7ed] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-semibold text-[#0b252c] flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#056468]" />
                <span>GST Tax Invoices Registry</span>
              </h2>
              <p className="text-xs text-slate-500">
                Official GST Tax Invoices generated for online orders & store dispatches.
              </p>
            </div>

            <a
              href="/invoices"
              className="px-4 py-2 bg-gradient-to-r from-[#056468] to-[#044e51] hover:from-[#044e51] hover:to-[#033b3d] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all shrink-0 cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-emerald-300" />
              <span>Open Invoice Barcode Scanner Hub</span>
            </a>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#cce7ed]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f2f9fa] text-[#0b252c] font-semibold uppercase tracking-wider border-b border-[#cce7ed]">
                <tr>
                  <th className="p-3.5">Invoice #</th>
                  <th className="p-3.5">Order Ref</th>
                  <th className="p-3.5">Customer Name</th>
                  <th className="p-3.5">GST Rate & Breakdown</th>
                  <th className="p-3.5">Grand Total</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">
                      No invoices generated yet.
                    </td>
                  </tr>
                ) : (
                  paginatedInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/70">
                      <td className="p-3.5 font-medium text-[#056468] font-mono">{inv.invoiceNumber}</td>
                      <td className="p-3.5 font-mono text-slate-600">{inv.order?.orderNumber || "—"}</td>
                      <td className="p-3.5 font-medium text-[#0b252c]">
                        {inv.customer?.name || inv.order?.customerName || "Customer"}
                      </td>
                      <td className="p-3.5 text-slate-600">
                        <span className="font-semibold text-slate-900">{inv.gstRate}%</span>
                        <span className="text-[10px] text-slate-500 ml-1">
                          (CGST: ₹{inv.cgst?.toFixed(2)} + SGST: ₹{inv.sgst?.toFixed(2)})
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-[#056468]">₹{inv.grandTotal.toFixed(2)}</td>
                      <td className="p-3.5 text-slate-500">{new Date(inv.createdAt).toLocaleDateString()}</td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => {
                            const matchedOrder = unifiedOrders.find(
                              (o) => o.id === inv.orderId || o.orderNumber === inv.order?.orderNumber
                            );
                            if (matchedOrder) {
                              handleOpenSingleInvoice(matchedOrder, "A4_INVOICE");
                            } else {
                              alert("Opening invoice preview...");
                            }
                          }}
                          className="px-3 py-1.5 bg-[#056468] hover:bg-[#044e51] text-white font-medium text-xs rounded-lg shadow-xs inline-flex items-center gap-1.5"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Print A4 Invoice</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <Pagination
              currentPage={invPage}
              totalItems={invoices.length}
              pageSize={invPageSize}
              onPageChange={setInvPage}
              onPageSizeChange={setInvPageSize}
              itemLabel="invoices"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: INVOICE & COMPANY BUSINESS SETTINGS */}
      {/* ========================================================================= */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          {/* Top Banner with Quick Actions */}
          <div className="bg-gradient-to-r from-white via-[#f0f8fa] to-white p-5 rounded-3xl border border-[#cce7ed] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#056468] text-white flex items-center justify-center shadow-md shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#0b252c]">
                    Company & Invoice Settings Hub
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-300">
                    Live System Profile
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl">
                  Manage your official brand details, GSTIN, registered office address, bank settlement accounts,
                  and terms printed on all A4 GST Tax Invoices, thermal shipping labels, and retail receipts.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (confirm("Reset company settings to default system template?")) {
                    setCompanySettings(DEFAULT_COMPANY_SETTINGS);
                  }
                }}
                className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-xl shadow-xs transition-all"
              >
                Reset Defaults
              </button>

              <button
                type="button"
                disabled={isSavingCompanySettings}
                onClick={() => handleSaveCompanySettings()}
                className="px-5 py-2 bg-[#056468] hover:bg-[#044e51] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingCompanySettings ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{isSavingCompanySettings ? "Saving Settings..." : "Save Company Profile"}</span>
              </button>
            </div>
          </div>

          {/* Feedback Alert Toast */}
          {companySettingsFeedback && (
            <div
              className={`p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in ${
                companySettingsFeedback.type === "success"
                  ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                  : "bg-rose-50 border-rose-300 text-rose-900"
              }`}
            >
              {companySettingsFeedback.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span className="text-xs font-semibold">{companySettingsFeedback.text}</span>
            </div>
          )}

          {/* Two-Column Grid: Form Controls (Left) & Live Preview (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Form Section */}
            <form onSubmit={handleSaveCompanySettings} className="lg:col-span-7 space-y-6">
              {/* SECTION 1: BUSINESS PROFILE & BRANDING */}
              <div className="bg-white border border-[#cce7ed] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <div className="w-7 h-7 rounded-lg bg-[#e3f2f5] text-[#056468] flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0b252c]">Company Profile & Branding</h3>
                    <p className="text-[11px] text-slate-500">
                      Official legal or trade name appearing at the top of your invoices.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Business / Trade Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={companySettings.companyName}
                      onChange={(e) =>
                        setCompanySettings({ ...companySettings, companyName: e.target.value })
                      }
                      placeholder="e.g. Stealth Sight Inventory Pvt Ltd"
                      className="w-full bg-slate-50/70 border border-[#cce7ed] rounded-xl px-3.5 py-2 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#056468]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Brand Tagline / Header Slogan</label>
                    <input
                      type="text"
                      value={companySettings.tagline}
                      onChange={(e) =>
                        setCompanySettings({ ...companySettings, tagline: e.target.value })
                      }
                      placeholder="e.g. Professional Barcode, Thermal Labeling & Warehouse Systems"
                      className="w-full bg-slate-50/70 border border-[#cce7ed] rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-[#056468]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Primary Billing Email <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={companySettings.email}
                      onChange={(e) =>
                        setCompanySettings({ ...companySettings, email: e.target.value })
                      }
                      placeholder="billing@company.com"
                      className="w-full bg-slate-50/70 border border-[#cce7ed] rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-[#056468]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Official Website URL</label>
                    <input
                      type="text"
                      value={companySettings.website}
                      onChange={(e) =>
                        setCompanySettings({ ...companySettings, website: e.target.value })
                      }
                      placeholder="www.yourcompany.com"
                      className="w-full bg-slate-50/70 border border-[#cce7ed] rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-[#056468]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Support / Contact Phone <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={companySettings.phone}
                      onChange={(e) =>
                        setCompanySettings({ ...companySettings, phone: e.target.value })
                      }
                      placeholder="+91 98200 12345"
                      className="w-full bg-slate-50/70 border border-[#cce7ed] rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-[#056468]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Alternate / WhatsApp Phone</label>
                    <input
                      type="text"
                      value={companySettings.alternatePhone}
                      onChange={(e) =>
                        setCompanySettings({ ...companySettings, alternatePhone: e.target.value })
                      }
                      placeholder="+91 98200 67890"
                      className="w-full bg-slate-50/70 border border-[#cce7ed] rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-[#056468]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: LEGAL & TAX REGISTRATION */}
              <div className="bg-white border border-[#cce7ed] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <div className="w-7 h-7 rounded-lg bg-[#e3f2f5] text-[#056468] flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0b252c]">Legal & Tax Registration</h3>
                    <p className="text-[11px] text-slate-500">
                      GSTIN, PAN, CIN and state identification for 100% statutory compliance.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      GSTIN Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={companySettings.gstin}
                      onChange={(e) =>
                        setCompanySettings({
                          ...companySettings,
                          gstin: e.target.value.toUpperCase().trim(),
                        })
                      }
                      placeholder="27AABCU9603R1ZN"
                      className="w-full bg-slate-50/70 border border-[#cce7ed] rounded-xl px-3.5 py-2 text-[#056468] font-mono font-bold uppercase focus:bg-white focus:outline-none focus:border-[#056468]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      PAN Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={companySettings.pan}
                      onChange={(e) =>
                        setCompanySettings({
                          ...companySettings,
                          pan: e.target.value.toUpperCase().trim(),
                        })
                      }
                      placeholder="AABCU9603R"
                      className="w-full bg-slate-50/70 border border-[#cce7ed] rounded-xl px-3.5 py-2 text-slate-900 font-mono uppercase focus:bg-white focus:outline-none focus:border-[#056468]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">CIN / Reg No</label>
                    <input
                      type="text"
                      value={companySettings.cin}
                      onChange={(e) =>
                        setCompanySettings({ ...companySettings, cin: e.target.value.toUpperCase() })
                      }
                      placeholder="U72900MH2024PTC123456"
                      className="w-full bg-slate-50/70 border border-[#cce7ed] rounded-xl px-3.5 py-2 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-[#056468]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Place of Supply / State <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={companySettings.state}
                      onChange={(e) =>
                        setCompanySettings({ ...companySettings, state: e.target.value })
                      }
                      placeholder="e.g. Maharashtra"
                      className="w-full bg-slate-50/70 border border-[#cce7ed] rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-[#056468]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">State GST Code</label>
                    <input
                      type="text"
                      value={companySettings.stateCode}
                      onChange={(e) =>
                        setCompanySettings({ ...companySettings, stateCode: e.target.value })
                      }
                      placeholder="e.g. 27"
                      className="w-full bg-slate-50/70 border border-[#cce7ed] rounded-xl px-3.5 py-2 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-[#056468]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: REGISTERED DISPATCH ADDRESS */}
              <div className="bg-white border border-[#cce7ed] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <div className="w-7 h-7 rounded-lg bg-[#e3f2f5] text-[#056468] flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0b252c]">Registered Office & Dispatch Address</h3>
                    <p className="text-[11px] text-slate-500">
                      Full premises address printed on invoice seller details and courier return labels.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Address Line 1 (Building / Unit / Area) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={companySettings.addressLine1}
                      onChange={(e) =>
                        setCompanySettings({ ...companySettings, addressLine1: e.target.value })
                      }
                      placeholder="e.g. Industrial Hub, Unit 4B, MIDC Industrial Area"
                      className="w-full bg-slate-50/70 border border-[#cce7ed] rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-[#056468]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Address Line 2 (Landmark / Street)
                    </label>
                    <input
                      type="text"
                      value={companySettings.addressLine2}
                      onChange={(e) =>
                        setCompanySettings({ ...companySettings, addressLine2: e.target.value })
                      }
                      placeholder="e.g. Opp. Seepz Gate No. 1, Andheri East"
                      className="w-full bg-slate-50/70 border border-[#cce7ed] rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-[#056468]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      City <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={companySettings.city}
                      onChange={(e) =>
                        setCompanySettings({ ...companySettings, city: e.target.value })
                      }
                      placeholder="e.g. Mumbai"
                      className="w-full bg-slate-50/70 border border-[#cce7ed] rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-[#056468]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      PIN Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={companySettings.pincode}
                      onChange={(e) =>
                        setCompanySettings({ ...companySettings, pincode: e.target.value })
                      }
                      placeholder="e.g. 400093"
                      className="w-full bg-slate-50/70 border border-[#cce7ed] rounded-xl px-3.5 py-2 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-[#056468]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: BANK & SETTLEMENT DETAILS */}
              <div className="bg-white border border-[#cce7ed] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <div className="w-7 h-7 rounded-lg bg-[#e3f2f5] text-[#056468] flex items-center justify-center font-bold text-xs">
                    4
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0b252c]">Bank & Payment Settlement Details</h3>
                    <p className="text-[11px] text-slate-500">
                      Bank account & UPI VPA printed in the invoice settlement box for NEFT / RTGS / IMPS.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Bank Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={companySettings.bankName}
                      onChange={(e) =>
                        setCompanySettings({ ...companySettings, bankName: e.target.value })
                      }
                      placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                      className="w-full bg-slate-50/70 border border-[#cce7ed] rounded-xl px-3.5 py-2 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#056468]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Account Holder / Beneficiary Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={companySettings.accountName}
                      onChange={(e) =>
                        setCompanySettings({ ...companySettings, accountName: e.target.value })
                      }
                      placeholder="e.g. Stealth Sight Inventory Pvt Ltd"
                      className="w-full bg-slate-50/70 border border-[#cce7ed] rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-[#056468]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Account Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={companySettings.accountNumber}
                      onChange={(e) =>
                        setCompanySettings({ ...companySettings, accountNumber: e.target.value })
                      }
                      placeholder="e.g. 50200012345678"
                      className="w-full bg-slate-50/70 border border-[#cce7ed] rounded-xl px-3.5 py-2 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:border-[#056468]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      IFSC Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={companySettings.ifscCode}
                      onChange={(e) =>
                        setCompanySettings({
                          ...companySettings,
                          ifscCode: e.target.value.toUpperCase().trim(),
                        })
                      }
                      placeholder="e.g. HDFC0001234"
                      className="w-full bg-slate-50/70 border border-[#cce7ed] rounded-xl px-3.5 py-2 text-slate-900 font-mono font-bold uppercase focus:bg-white focus:outline-none focus:border-[#056468]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Bank Branch Location</label>
                    <input
                      type="text"
                      value={companySettings.branch}
                      onChange={(e) =>
                        setCompanySettings({ ...companySettings, branch: e.target.value })
                      }
                      placeholder="e.g. MIDC Andheri East Branch, Mumbai"
                      className="w-full bg-slate-50/70 border border-[#cce7ed] rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-[#056468]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-700">UPI ID / VPA Handler</label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={companySettings.showUpi ?? true}
                          onChange={(e) =>
                            setCompanySettings({ ...companySettings, showUpi: e.target.checked })
                          }
                          className="rounded border-[#cce7ed] text-[#056468] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-[#056468]">
                          {companySettings.showUpi ? "Show on Invoices" : "Hidden"}
                        </span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={companySettings.upiId}
                      onChange={(e) =>
                        setCompanySettings({ ...companySettings, upiId: e.target.value })
                      }
                      placeholder="e.g. stealthsight@hdfcbank"
                      className="w-full bg-slate-50/70 border border-[#cce7ed] rounded-xl px-3.5 py-2 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-[#056468]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Official Logo File Path</label>
                    <input
                      type="text"
                      value={companySettings.logoUrl}
                      onChange={(e) =>
                        setCompanySettings({ ...companySettings, logoUrl: e.target.value })
                      }
                      placeholder="/logo/1-01.png"
                      className="w-full bg-slate-50/70 border border-[#cce7ed] rounded-xl px-3.5 py-2 text-slate-900 font-mono focus:bg-white focus:outline-none focus:border-[#056468]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: INVOICE TERMS, SIGNATORY & FOOTER */}
              <div className="bg-white border border-[#cce7ed] rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <div className="w-7 h-7 rounded-lg bg-[#e3f2f5] text-[#056468] flex items-center justify-center font-bold text-xs">
                    5
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#0b252c]">Invoice Terms & Signatory Customization</h3>
                    <p className="text-[11px] text-slate-500">
                      Standard numbering prefix, statutory terms, declaration, and authorized signatory.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Invoice Numbering Prefix</label>
                    <input
                      type="text"
                      value={companySettings.invoicePrefix}
                      onChange={(e) =>
                        setCompanySettings({ ...companySettings, invoicePrefix: e.target.value })
                      }
                      placeholder="e.g. INV-2026-"
                      className="w-full bg-slate-50/70 border border-[#cce7ed] rounded-xl px-3.5 py-2 text-[#056468] font-mono font-bold focus:bg-white focus:outline-none focus:border-[#056468]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Authorized Signatory Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={companySettings.authorizedSignatory}
                      onChange={(e) =>
                        setCompanySettings({
                          ...companySettings,
                          authorizedSignatory: e.target.value,
                        })
                      }
                      placeholder="e.g. Rushabh Gandhi"
                      className="w-full bg-slate-50/70 border border-[#cce7ed] rounded-xl px-3.5 py-2 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:border-[#056468]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Signatory Designation</label>
                    <input
                      type="text"
                      value={companySettings.signatoryDesignation}
                      onChange={(e) =>
                        setCompanySettings({
                          ...companySettings,
                          signatoryDesignation: e.target.value,
                        })
                      }
                      placeholder="e.g. Managing Director / Authorized Signatory"
                      className="w-full bg-slate-50/70 border border-[#cce7ed] rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-[#056468]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Terms & Conditions</label>
                    <textarea
                      rows={3}
                      value={companySettings.invoiceTerms}
                      onChange={(e) =>
                        setCompanySettings({ ...companySettings, invoiceTerms: e.target.value })
                      }
                      placeholder="1. Goods once sold will not be accepted back... 2. Subject to Mumbai Jurisdiction."
                      className="w-full bg-slate-50/70 border border-[#cce7ed] rounded-xl p-3 text-slate-900 focus:bg-white focus:outline-none focus:border-[#056468] font-mono text-[11px]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Invoice Footer Note</label>
                    <input
                      type="text"
                      value={companySettings.footerNote}
                      onChange={(e) =>
                        setCompanySettings({ ...companySettings, footerNote: e.target.value })
                      }
                      placeholder="Thank you for choosing us! For billing queries, email billing@..."
                      className="w-full bg-slate-50/70 border border-[#cce7ed] rounded-xl px-3.5 py-2 text-slate-900 focus:bg-white focus:outline-none focus:border-[#056468]"
                    />
                  </div>
                </div>
              </div>

              {/* Form Save Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCompanySettings(initialCompanySettings || DEFAULT_COMPANY_SETTINGS)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold text-xs"
                >
                  Cancel Changes
                </button>
                <button
                  type="submit"
                  disabled={isSavingCompanySettings}
                  className="px-6 py-2.5 bg-[#056468] hover:bg-[#044e51] text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSavingCompanySettings ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSavingCompanySettings ? "Saving Settings..." : "Save Invoice & Company Settings"}</span>
                </button>
              </div>
            </form>

            {/* LIVE PREVIEW SECTION (Right Column) */}
            <div className="lg:col-span-5 sticky top-6 space-y-4">
              <div className="bg-white border-2 border-[#056468]/30 rounded-3xl p-5 shadow-lg space-y-4 font-sans">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#056468]" />
                    <span className="text-xs font-bold text-[#0b252c] uppercase tracking-wider">
                      Live A4 Tax Invoice Preview
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Updates in real-time</span>
                </div>

                {/* Simulated A4 Invoice Document Layout */}
                <div className="bg-slate-50/90 border border-slate-300 rounded-2xl p-4 text-[10.5px] space-y-3 shadow-inner">
                  {/* Top Company Header */}
                  <div className="flex justify-between items-start border-b-2 border-[#056468] pb-2.5">
                    <div className="max-w-[65%]">
                      <img
                        src={companySettings.logoUrl || "/logo/1-01.png"}
                        alt="Logo"
                        className="h-7 max-h-7 max-w-[130px] object-contain mb-1.5 block"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                      <div className="text-base font-black text-[#056468] tracking-tight leading-snug">
                        {companySettings.companyName || "Your Company Name"}
                      </div>
                      {companySettings.tagline && (
                        <div className="text-[9.5px] font-semibold text-slate-600 mt-0.5 max-w-sm">
                          {companySettings.tagline}
                        </div>
                      )}
                      <div className="text-[9px] text-slate-600 mt-1 max-w-sm leading-tight">
                        {companySettings.addressLine1}
                        {companySettings.addressLine2 ? `, ${companySettings.addressLine2}` : ""},{" "}
                        {companySettings.city}, {companySettings.state} - {companySettings.pincode}
                      </div>
                      <div className="text-[9px] text-slate-700 mt-0.5">
                        Tel: <strong>{companySettings.phone}</strong> | Email:{" "}
                        <strong>{companySettings.email}</strong>
                      </div>
                      <div className="mt-1 text-[9px] font-bold text-slate-900">
                        GSTIN:{" "}
                        <span className="font-mono text-[#056468]">{companySettings.gstin}</span> | State:{" "}
                        <strong>
                          {companySettings.state} ({companySettings.stateCode})
                        </strong>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="px-2 py-0.5 bg-[#056468] text-white font-bold text-[10px] rounded uppercase">
                        TAX INVOICE
                      </span>
                      <div className="mt-1.5 text-[9px] font-mono leading-tight">
                        <div>
                          Inv: <strong>{companySettings.invoicePrefix || "INV-"}0001</strong>
                        </div>
                        <div>Date: {new Date().toLocaleDateString("en-IN")}</div>
                        <div>PAN: <strong>{companySettings.pan}</strong></div>
                      </div>
                    </div>
                  </div>

                  {/* Sample Customer & Dispatch Block */}
                  <div className="grid grid-cols-2 gap-2 p-2 bg-white rounded-lg border border-slate-200 text-[9px]">
                    <div>
                      <div className="font-bold text-[#056468] uppercase text-[8px] border-b border-slate-100 pb-0.5 mb-1">
                        Billed To:
                      </div>
                      <div className="font-bold text-slate-900">Sample Customer</div>
                      <div className="text-slate-500">123 Market Street, Andheri East</div>
                      <div>Place of Supply: <strong>{companySettings.state} ({companySettings.stateCode})</strong></div>
                    </div>
                    <div>
                      <div className="font-bold text-[#056468] uppercase text-[8px] border-b border-slate-100 pb-0.5 mb-1">
                        Dispatch & Courier:
                      </div>
                      <div>Channel: <strong>WEBSITE / POS</strong></div>
                      <div>Payment: <strong className="text-emerald-700">PREPAID / SETTLED</strong></div>
                    </div>
                  </div>

                  {/* Sample Goods Line */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white text-[9px]">
                    <div className="bg-[#f0f8fa] p-1.5 font-bold text-[#0b252c] flex justify-between border-b border-slate-200">
                      <span>Item Description</span>
                      <span>Total Amount</span>
                    </div>
                    <div className="p-1.5 flex justify-between items-center text-slate-700">
                      <span>Thermal Barcode Label Roll 50x50mm (1000 Pcs)</span>
                      <span className="font-mono font-bold text-[#056468]">₹1,180.00</span>
                    </div>
                  </div>

                  {/* Bank & Settlement Box */}
                  <div className="p-2 bg-white rounded-lg border border-slate-200 text-[9px] space-y-1">
                    <div className="font-bold text-[#056468] uppercase text-[8px]">
                      Bank Settlement Details:
                    </div>
                    <div className="text-slate-700 leading-tight">
                      Bank: <strong>{companySettings.bankName || "—"}</strong> | Branch:{" "}
                      <strong>{companySettings.branch || "—"}</strong>
                      <br />
                      A/C: <strong className="font-mono">{companySettings.accountNumber || "—"}</strong> | IFSC:{" "}
                      <strong className="font-mono">{companySettings.ifscCode || "—"}</strong>
                      {companySettings.showUpi && companySettings.upiId && (
                        <div>
                          UPI VPA: <strong className="font-mono text-[#056468]">{companySettings.upiId}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Terms & Signatory */}
                  <div className="p-2 bg-white rounded-lg border border-slate-200 text-[8.5px] flex justify-between items-end gap-2">
                    <div className="text-slate-500 max-w-[200px] leading-tight">
                      <strong className="text-slate-700 text-[8px] block mb-0.5">Terms:</strong>
                      <div className="line-clamp-2">{companySettings.invoiceTerms}</div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-bold text-[#056468] text-[9.5px]">
                        For {companySettings.companyName}
                      </div>
                      <div className="mt-2 text-[8px] text-slate-500 border-t border-slate-300 pt-0.5">
                        {companySettings.authorizedSignatory}
                        <br />
                        <span className="italic">{companySettings.signatoryDesignation}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Notice */}
                  {companySettings.footerNote && (
                    <div className="text-center text-[8px] text-slate-400 border-t border-slate-200 pt-1">
                      {companySettings.footerNote}
                    </div>
                  )}
                </div>

                {/* Quick Test Button */}
                <button
                  type="button"
                  onClick={() => {
                    handleOpenSingleInvoice(
                      {
                        id: "DEMO-001",
                        orderNumber: `${companySettings.invoicePrefix || "INV-"}0001`,
                        channel: "WEBSITE",
                        customerName: "Sample Client Pvt Ltd",
                        customerEmail: "client@example.com",
                        customerPhone: "+91 98000 11223",
                        shippingAddress: "402 Prime Corporate Park, Mumbai, MH - 400059",
                        buyerCity: "Mumbai",
                        buyerState: "Maharashtra",
                        buyerPincode: "400059",
                        totalAmount: 2500,
                        status: "Delivered",
                        createdAt: new Date(),
                        courier: "Blue Dart Express",
                        trackingNumber: "AWB-9830219",
                        items: [
                          {
                            title: "Direct Thermal Barcode Printer 4-inch",
                            sku: "PRN-DT4-01",
                            quantity: 1,
                            unitPrice: 2500,
                            totalPrice: 2500,
                          },
                        ],
                      },
                      "A4_INVOICE"
                    );
                  }}
                  className="w-full py-2 bg-[#e3f2f5] hover:bg-[#d0ebf0] text-[#056468] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Test Sample Invoice Print Preview</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RICH ORDER & CUSTOMER DETAILS MODAL (VIEW / EDIT / CHANGE STATUS) */}
      {/* ========================================================================= */}
      {selectedDetailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white border border-[#cce7ed] rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="bg-[#f0f8fa] border-b border-[#cce7ed] p-4 sm:p-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#056468] text-white flex items-center justify-center shadow-sm">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-[#0b252c]">
                      Order #{selectedDetailOrder.orderNumber}
                    </h3>
                    {selectedDetailOrder.channel === "AMAZON" ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        Amazon SP-API
                      </span>
                    ) : selectedDetailOrder.channel === "FLIPKART" ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                        Flipkart Ekart
                      </span>
                    ) : selectedDetailOrder.channel === "POS" ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                        POS Quick Scan
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                        Website Store
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Placed on{" "}
                    {new Date(selectedDetailOrder.createdAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedDetailOrder(null)}
                className="w-8 h-8 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              {/* Feedback Alert */}
              {detailModalFeedback && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2 ${
                    detailModalFeedback.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-rose-50 border-rose-200 text-rose-900"
                  }`}
                >
                  {detailModalFeedback.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span className="font-semibold">{detailModalFeedback.text}</span>
                </div>
              )}

              {/* Status Update Control Section */}
              <div className="p-4 rounded-2xl bg-[#e3f2f5]/40 border border-[#056468]/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#056468] block">
                      Order Fulfillment Status
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Change status to reflect real-time order lifecycle & customer tracking.
                    </span>
                  </div>

                  {/* Status Dropdown */}
                  <div className="flex items-center gap-2">
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="bg-white border-2 border-[#056468] rounded-xl px-3 py-1.5 text-xs font-bold text-[#056468] shadow-xs focus:outline-none"
                    >
                      {ORDER_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => handleSaveOrderDetails(false)}
                      className="px-3 py-1.5 bg-[#056468] hover:bg-[#044e51] text-white font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      {isUpdatingStatus ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>Update Status</span>
                    </button>
                  </div>
                </div>

                {/* Quick Status Pill Stepper */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {ORDER_STATUS_OPTIONS.map((opt) => {
                    const isCurrent = editStatus === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setEditStatus(opt.value)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          isCurrent
                            ? "bg-[#056468] text-white shadow-xs ring-2 ring-[#056468]/30"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Customer & Delivery Information Card */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <User className="w-4 h-4 text-[#056468]" />
                    <span>Customer & Delivery Details</span>
                  </div>

                  {/* Save Customer in Directory Button */}
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => handleSaveOrderDetails(true)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold inline-flex items-center gap-1 transition-all"
                    title="Save this buyer to Customer Directory for CRM & future orders"
                  >
                    <Save className="w-3 h-3 text-emerald-600" />
                    <span>Save to Customer Directory</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Customer Name</label>
                    <div className="font-semibold text-slate-900 text-xs mt-0.5">
                      {selectedDetailOrder.customerName}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Phone Number</label>
                    <input
                      type="text"
                      value={editCustomerPhone}
                      onChange={(e) => setEditCustomerPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 mt-0.5 focus:outline-none focus:border-[#056468]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Email Address</label>
                    <input
                      type="email"
                      value={editCustomerEmail}
                      onChange={(e) => setEditCustomerEmail(e.target.value)}
                      placeholder="customer@email.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 mt-0.5 focus:outline-none focus:border-[#056468]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Channel / Source</label>
                    <div className="font-medium text-slate-800 text-xs mt-0.5 flex items-center gap-1.5">
                      <span className="font-bold text-[#056468]">{selectedDetailOrder.channel}</span>
                      {selectedDetailOrder.company && (
                        <span className="text-slate-400">({selectedDetailOrder.company})</span>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Delivery & Shipping Address</label>
                    <textarea
                      rows={2}
                      value={editShippingAddress}
                      onChange={(e) => setEditShippingAddress(e.target.value)}
                      placeholder="House/Street, Landmark, City, State, PIN..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 mt-0.5 focus:outline-none focus:border-[#056468]"
                    />
                  </div>
                </div>
              </div>

              {/* Items & Scanned Unit Barcodes Table */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2.5">
                <div className="text-slate-900 font-bold text-xs flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-[#056468]" />
                    Order Line Items ({selectedDetailOrder.items.length})
                  </span>
                  <span className="text-slate-500 font-normal">
                    Total Qty: {selectedDetailOrder.items.reduce((acc, i) => acc + i.quantity, 0)} units
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {selectedDetailOrder.items.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 text-xs">{item.title}</div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-1">
                          <span>
                            SKU: <strong className="font-mono text-slate-700">{item.sku}</strong>
                          </span>
                          {item.asinOrFsn && (
                            <span className="font-mono bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded text-[10px]">
                              {item.asinOrFsn}
                            </span>
                          )}
                          <span>
                            Qty: <strong className="text-slate-900">{item.quantity}</strong>
                          </span>
                          <span>
                            @ ₹{item.unitPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* Unit Barcode info */}
                        {item.unitBarcode ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 mt-1.5 rounded bg-emerald-50 border border-emerald-200 text-[10px] font-mono font-bold text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Unit Barcode: {item.unitBarcode}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic mt-1">
                            Standard SKU stock allocation
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-extrabold text-slate-900 text-xs">
                          ₹{item.totalPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Courier Tracking & Dispatch Details */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                <div className="text-slate-900 font-bold text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Truck className="w-4 h-4 text-[#056468]" />
                  <span>Logistics, Courier & Tracking Details</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Courier Partner</label>
                    <input
                      type="text"
                      value={editCourier}
                      onChange={(e) => setEditCourier(e.target.value)}
                      placeholder="e.g. Amazon ATS, Ekart, Blue Dart, Delhivery"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 mt-0.5 focus:outline-none focus:border-[#056468]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Tracking / AWB Number</label>
                    <div className="flex items-center gap-1 mt-0.5">
                      <input
                        type="text"
                        value={editTrackingNumber}
                        onChange={(e) => setEditTrackingNumber(e.target.value)}
                        placeholder="e.g. AWB-982301928"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-mono focus:outline-none focus:border-[#056468]"
                      />
                      {editTrackingNumber && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(editTrackingNumber);
                            alert("Tracking number copied to clipboard!");
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-semibold text-slate-700 shrink-0"
                          title="Copy tracking number"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Order Notes / Internal Remarks</label>
                    <input
                      type="text"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Special instructions, delivery comments, payment references..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 mt-0.5 focus:outline-none focus:border-[#056468]"
                    />
                  </div>
                </div>
              </div>

              {/* Total Summary */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Total Order Value
                  </span>
                  <span className="text-xs text-slate-600">Includes all taxes & applicable GST</span>
                </div>
                <div className="text-xl font-black text-[#056468]">
                  ₹{selectedDetailOrder.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="bg-[#f0f8fa] border-t border-[#cce7ed] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenSingleInvoice(selectedDetailOrder, "A4_INVOICE");
                  }}
                  className="px-3.5 py-2 bg-[#056468] hover:bg-[#044e51] text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Print A4 GST Tax Invoice</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleOpenSingleInvoice(selectedDetailOrder, "THERMAL_LABEL");
                  }}
                  className="px-3.5 py-2 bg-white border border-[#cce7ed] hover:bg-slate-100 text-[#056468] font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print 100×150mm Label</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDetailOrder(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-900 text-xs"
                >
                  Close
                </button>

                <button
                  type="button"
                  disabled={isUpdatingStatus}
                  onClick={() => handleSaveOrderDetails(false)}
                  className="px-5 py-2 bg-[#056468] hover:bg-[#044e51] text-white font-bold text-xs rounded-xl shadow-sm inline-flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {isUpdatingStatus ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Issue Quotation Modal */}
      {quoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#cce7ed] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-[#0b252c] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#056468]" />
                Issue B2B Formal Quotation
              </h3>
              <button onClick={() => setQuoModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#0b252c] mb-1">Select Customer</label>
                <select
                  value={quoCustomerId}
                  onChange={(e) => setQuoCustomerId(e.target.value)}
                  className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl px-3 py-2 text-[#0b252c] text-sm focus:outline-none focus:border-[#056468]"
                >
                  <option value="">-- Generic Walk-in / Unregistered Client --</option>
                  {localCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.company ? `(${c.company})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#0b252c] mb-1">Quotation Total Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={quoAmount}
                  onChange={(e) => setQuoAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl px-3 py-2 text-[#0b252c] text-sm focus:outline-none focus:border-[#056468]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#0b252c] mb-1">Terms / Notes</label>
                <textarea
                  rows={3}
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

      {/* Double Verification Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-rose-50 border-b border-rose-100 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-rose-800">
                <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    {deleteModal.isDemoReset
                      ? "Wipe All Demo & Test Orders"
                      : deleteModal.isBatch
                      ? `Delete ${deleteModal.orders.length} Selected Orders`
                      : `Delete Order #${deleteModal.orders[0]?.orderNumber}`}
                  </h3>
                  <p className="text-xs text-rose-600 font-medium">Double-Verification Required</p>
                </div>
              </div>
              <button
                onClick={() => setDeleteModal(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-white/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs text-slate-700">
              <p className="text-slate-600 leading-relaxed">
                {deleteModal.isDemoReset
                  ? "This will permanently clear all demo/test orders, customer invoices, and sales transactions. Any unit barcodes recorded as 'SOLD' will be released back to 'AVAILABLE' stock automatically."
                  : deleteModal.isBatch
                  ? `You are about to permanently delete ${deleteModal.orders.length} orders and their generated invoices. Any physical serial barcodes will be released back to AVAILABLE stock.`
                  : `You are about to permanently delete order #${deleteModal.orders[0]?.orderNumber} (${deleteModal.orders[0]?.customerName}, ₹${deleteModal.orders[0]?.totalAmount.toFixed(2)}). Any sold item barcodes in this order will be released back to AVAILABLE inventory.`}
              </p>

              {/* Order Details Preview Box */}
              {!deleteModal.isDemoReset && deleteModal.orders.length <= 4 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 max-h-44 overflow-y-auto">
                  {deleteModal.orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="flex justify-between items-center text-[11px] py-1 border-b border-slate-100 last:border-none"
                    >
                      <div>
                        <span className="font-mono font-bold text-slate-900">{ord.orderNumber}</span>
                        <span className="text-slate-500 ml-2">({ord.customerName})</span>
                      </div>
                      <span className="font-mono font-bold text-slate-800">
                        ₹{ord.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Verification prompt */}
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 space-y-2">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    Step 2 Verification: Type &quot;{deleteModal.isDemoReset ? "RESET" : "DELETE"}&quot; below to confirm
                  </span>
                </div>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                  placeholder={deleteModal.isDemoReset ? "Type RESET" : "Type DELETE"}
                  className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 font-mono font-bold text-sm tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {deleteFeedback && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg font-medium">
                  {deleteFeedback}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModal(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDelete}
                  disabled={
                    isDeleting ||
                    (deleteModal.isDemoReset
                      ? deleteConfirmText.trim() !== "RESET"
                      : deleteConfirmText.trim() !== "DELETE")
                  }
                  className="px-5 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>
                    {isDeleting
                      ? "Deleting..."
                      : deleteModal.isDemoReset
                      ? "Confirm Reset Demo"
                      : "Confirm Permanent Delete"}
                  </span>
                </button>
              </div>
            </div>
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
          companySettings={companySettings}
        />
      )}
    </div>
  );
}
