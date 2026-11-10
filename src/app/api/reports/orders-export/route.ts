import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 0;

export interface OrderExportItemRow {
  srNo: number;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  date: string;
  createdAt: string;
  channel: string; // AMAZON | FLIPKART | MEESHO | POS | WEBSITE
  channelLabel: string;
  company: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  unitBarcode?: string | null;
  status: string;
  outBy: string;
  courier?: string | null;
  trackingNumber?: string | null;
  shippingAddress?: string | null;
}

// Channel detection helper
export function detectOrderChannel(order: {
  channel?: string | null;
  orderNumber?: string | null;
  notes?: string | null;
  customerName?: string | null;
  company?: string | null;
}): { channel: string; label: string; companyName: string } {
  if (order.channel) {
    const ch = order.channel.toUpperCase();
    if (ch.includes("AMAZON")) return { channel: "AMAZON", label: "Amazon", companyName: "Amazon India" };
    if (ch.includes("FLIPKART")) return { channel: "FLIPKART", label: "Flipkart", companyName: "Flipkart Internet Pvt Ltd" };
    if (ch.includes("MEESHO")) return { channel: "MEESHO", label: "Meesho", companyName: "Fashnear Technologies (Meesho)" };
    if (ch.includes("POS") || ch.includes("WALK")) return { channel: "POS", label: "Walk-in (POS)", companyName: "Retail Store Walk-in" };
    if (ch.includes("WEBSITE")) return { channel: "WEBSITE", label: "Website", companyName: "Online Direct Store" };
  }

  const num = (order.orderNumber || "").toUpperCase();
  const notes = (order.notes || "").toUpperCase();
  const cust = (order.customerName || "").toUpperCase();
  const comp = (order.company || "").toUpperCase();

  if (num.startsWith("AMZ-") || num.startsWith("40") || notes.includes("AMAZON") || cust.includes("AMAZON") || comp.includes("AMAZON")) {
    return { channel: "AMAZON", label: "Amazon", companyName: "Amazon India" };
  }
  if (num.startsWith("FK-") || num.startsWith("OD") || notes.includes("FLIPKART") || cust.includes("FLIPKART") || comp.includes("FLIPKART")) {
    return { channel: "FLIPKART", label: "Flipkart", companyName: "Flipkart Internet Pvt Ltd" };
  }
  if (num.startsWith("MEE-") || notes.includes("MEESHO") || cust.includes("MEESHO") || comp.includes("MEESHO")) {
    return { channel: "MEESHO", label: "Meesho", companyName: "Fashnear Technologies (Meesho)" };
  }
  if (num.startsWith("POS-") || notes.includes("POS") || cust.includes("WALK-IN") || cust.includes("RETAIL")) {
    return { channel: "POS", label: "Walk-in (POS)", companyName: "Retail Store Walk-in" };
  }

  return { channel: "WEBSITE", label: "Website Store", companyName: order.company || "Online Direct Store" };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const channelsParam = searchParams.get("channels") || searchParams.get("channel") || "ALL";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const statusParam = searchParams.get("status") || "ALL";
    const format = searchParams.get("format");
    const columnsParam = searchParams.get("columns"); // Comma-separated list of active columns

    // Parse active channels array
    const targetChannels =
      channelsParam === "ALL"
        ? []
        : channelsParam.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);

    // Build date filters
    const dateFilter: any = {};
    if (startDateParam) {
      dateFilter.gte = new Date(startDateParam);
    }
    if (endDateParam) {
      const end = new Date(endDateParam);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    const orderWhere: any = {};
    if (Object.keys(dateFilter).length > 0) {
      orderWhere.createdAt = dateFilter;
    }
    if (statusParam !== "ALL") {
      orderWhere.status = { equals: statusParam, mode: "insensitive" };
    }

    const mpWhere: any = {};
    if (Object.keys(dateFilter).length > 0) {
      mpWhere.orderDate = dateFilter;
    }
    if (statusParam !== "ALL") {
      mpWhere.orderStatus = { equals: statusParam, mode: "insensitive" };
    }

    // Fetch Standard Orders and Marketplace Orders concurrently
    const [standardOrders, marketplaceOrders] = await Promise.all([
      prisma.order.findMany({
        where: orderWhere,
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: {
              unitBarcode: {
                select: {
                  id: true,
                  barcode: true,
                  serialNumber: true,
                  transactions: {
                    select: {
                      transactionType: true,
                      performedBy: true,
                    },
                    take: 1,
                  },
                },
              },
            },
          },
          customer: {
            select: {
              name: true,
              company: true,
              phone: true,
              email: true,
            },
          },
        },
      }),
      prisma.marketplaceOrder.findMany({
        where: mpWhere,
        orderBy: { orderDate: "desc" },
        include: {
          items: true,
          credential: {
            select: { channel: true },
          },
        },
      }),
    ]);

    const rows: OrderExportItemRow[] = [];
    let srNo = 1;

    // Process Standard Orders
    for (const ord of standardOrders) {
      const channelInfo = detectOrderChannel({
        channel: ord.channel,
        orderNumber: ord.orderNumber,
        notes: ord.notes,
        customerName: ord.customerName,
        company: ord.company || ord.customer?.company,
      });

      // Filter by channel if specific channels selected
      if (targetChannels.length > 0 && !targetChannels.includes(channelInfo.channel)) {
        continue;
      }

      // Resolve "Out by whom"
      const outByResolved =
        ord.outBy ||
        ord.items?.[0]?.unitBarcode?.transactions?.find((t) => t.transactionType === "SALE")?.performedBy ||
        (ord.notes && ord.notes.includes("Packed by")
          ? ord.notes.split("Packed by")[1]?.split("|")[0]?.trim()
          : null) ||
        (ord.notes && ord.notes.includes("Dispatched by")
          ? ord.notes.split("Dispatched by")[1]?.split("|")[0]?.trim()
          : null) ||
        "Admin";

      const dt = new Date(ord.createdAt);
      const formattedDate = dt.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      const items = ord.items && ord.items.length > 0 ? ord.items : [];
      if (items.length === 0) {
        // Order without itemized records
        rows.push({
          srNo: srNo++,
          orderId: ord.id,
          orderNumber: ord.orderNumber,
          customerName: ord.customerName || ord.customer?.name || "Customer",
          customerPhone: ord.customerPhone || ord.customer?.phone,
          customerEmail: ord.customerEmail || ord.customer?.email,
          date: formattedDate,
          createdAt: ord.createdAt.toISOString(),
          channel: channelInfo.channel,
          channelLabel: channelInfo.label,
          company: ord.company || ord.customer?.company || channelInfo.companyName,
          sku: "GENERAL-ORDER",
          productName: "Order Total",
          quantity: 1,
          unitPrice: ord.totalAmount,
          amount: ord.totalAmount,
          unitBarcode: null,
          status: ord.status,
          outBy: outByResolved,
          shippingAddress: ord.shippingAddress,
        });
      } else {
        for (const itm of items) {
          rows.push({
            srNo: srNo++,
            orderId: ord.id,
            orderNumber: ord.orderNumber,
            customerName: ord.customerName || ord.customer?.name || "Customer",
            customerPhone: ord.customerPhone || ord.customer?.phone,
            customerEmail: ord.customerEmail || ord.customer?.email,
            date: formattedDate,
            createdAt: ord.createdAt.toISOString(),
            channel: channelInfo.channel,
            channelLabel: channelInfo.label,
            company: ord.company || ord.customer?.company || channelInfo.companyName,
            sku: itm.sku,
            productName: itm.name,
            quantity: itm.quantity || 1,
            unitPrice: itm.unitPrice || (itm.totalPrice / (itm.quantity || 1)),
            amount: itm.totalPrice || (itm.unitPrice * (itm.quantity || 1)),
            unitBarcode: itm.unitBarcode?.barcode || null,
            status: ord.status,
            outBy: outByResolved,
            shippingAddress: ord.shippingAddress,
          });
        }
      }
    }

    // Process Marketplace Orders
    for (const mp of marketplaceOrders) {
      const channelType = (mp.channel || "AMAZON").toUpperCase();
      const channelInfo = {
        channel: channelType,
        label: channelType === "AMAZON" ? "Amazon" : channelType === "FLIPKART" ? "Flipkart" : channelType,
        companyName:
          channelType === "AMAZON"
            ? "Amazon India"
            : channelType === "FLIPKART"
            ? "Flipkart Internet Pvt Ltd"
            : `${channelType} Marketplace`,
      };

      if (targetChannels.length > 0 && !targetChannels.includes(channelInfo.channel)) {
        continue;
      }

      const outByResolved = mp.outBy || "Admin (Fulfillment)";
      const dt = new Date(mp.orderDate);
      const formattedDate = dt.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

      const mpItems = mp.items && mp.items.length > 0 ? mp.items : [];
      if (mpItems.length === 0) {
        rows.push({
          srNo: srNo++,
          orderId: mp.id,
          orderNumber: mp.channelOrderId,
          customerName: mp.buyerName || `${channelInfo.label} Buyer`,
          date: formattedDate,
          createdAt: mp.orderDate.toISOString(),
          channel: channelInfo.channel,
          channelLabel: channelInfo.label,
          company: channelInfo.companyName,
          sku: "MP-GENERAL",
          productName: "Marketplace Order",
          quantity: 1,
          unitPrice: mp.totalAmount,
          amount: mp.totalAmount,
          unitBarcode: null,
          status: mp.orderStatus,
          outBy: outByResolved,
          courier: mp.courier,
          trackingNumber: mp.trackingNumber,
          shippingAddress: mp.shippingAddress,
        });
      } else {
        for (const mi of mpItems) {
          const itemAmt = (mi.itemPrice || 0) * (mi.quantity || 1);
          rows.push({
            srNo: srNo++,
            orderId: mp.id,
            orderNumber: mp.channelOrderId,
            customerName: mp.buyerName || `${channelInfo.label} Buyer`,
            date: formattedDate,
            createdAt: mp.orderDate.toISOString(),
            channel: channelInfo.channel,
            channelLabel: channelInfo.label,
            company: channelInfo.companyName,
            sku: mi.channelSku || mi.asinOrFsn || "SKU",
            productName: mi.title || mi.channelSku,
            quantity: mi.quantity || 1,
            unitPrice: mi.itemPrice || 0,
            amount: itemAmt > 0 ? itemAmt : mp.totalAmount,
            unitBarcode: mi.scannedBarcode || null,
            status: mp.orderStatus,
            outBy: outByResolved,
            courier: mp.courier,
            trackingNumber: mp.trackingNumber,
            shippingAddress: mp.shippingAddress,
          });
        }
      }
    }

    // Apply Client Search Filter (matches Customer, Order ID, SKU, Barcode, OutBy, Courier)
    const filteredRows = search
      ? rows.filter(
          (r) =>
            r.customerName.toLowerCase().includes(search) ||
            r.orderNumber.toLowerCase().includes(search) ||
            r.sku.toLowerCase().includes(search) ||
            r.productName.toLowerCase().includes(search) ||
            r.outBy.toLowerCase().includes(search) ||
            (r.unitBarcode && r.unitBarcode.toLowerCase().includes(search)) ||
            (r.company && r.company.toLowerCase().includes(search))
        )
      : rows;

    // Sort by created date descending
    filteredRows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Re-assign sequential serial numbers
    filteredRows.forEach((r, idx) => {
      r.srNo = idx + 1;
    });

    // Summary calculations
    const uniqueOrders = new Set(filteredRows.map((r) => r.orderNumber));
    const totalOrders = uniqueOrders.size;
    const totalRevenue = filteredRows.reduce((sum, r) => sum + r.amount, 0);
    const totalUnits = filteredRows.reduce((sum, r) => sum + r.quantity, 0);

    const channelBreakdown: Record<string, { count: number; revenue: number }> = {};
    for (const r of filteredRows) {
      if (!channelBreakdown[r.channel]) {
        channelBreakdown[r.channel] = { count: 0, revenue: 0 };
      }
      channelBreakdown[r.channel].count += 1;
      channelBreakdown[r.channel].revenue += r.amount;
    }

    // Direct CSV Export
    if (format === "csv") {
      // Check which columns the user configured or default
      const requestedCols = columnsParam
        ? columnsParam.split(",").map((c) => c.trim()).filter(Boolean)
        : ["customerName", "orderId", "date", "sku", "amount", "company", "outBy"];

      // Map column keys to header labels
      const colMap: Record<string, { label: string; getValue: (r: OrderExportItemRow) => any }> = {
        srNo: { label: "Srno", getValue: (r) => r.srNo },
        customerName: { label: "Customer name", getValue: (r) => `"${r.customerName.replace(/"/g, '""')}"` },
        orderId: { label: "Order id", getValue: (r) => `"${r.orderNumber.replace(/"/g, '""')}"` },
        date: { label: "Date", getValue: (r) => `"${r.date}"` },
        sku: { label: "Sku", getValue: (r) => `"${r.sku.replace(/"/g, '""')}"` },
        amount: { label: "Amount", getValue: (r) => r.amount },
        company: { label: "Company name", getValue: (r) => `"${(r.company || r.channelLabel).replace(/"/g, '""')}"` },
        outBy: { label: "Out by whom", getValue: (r) => `"${r.outBy.replace(/"/g, '""')}"` },
        productName: { label: "Product name", getValue: (r) => `"${r.productName.replace(/"/g, '""')}"` },
        quantity: { label: "Quantity", getValue: (r) => r.quantity },
        unitBarcode: { label: "Barcode", getValue: (r) => `"${(r.unitBarcode || "").replace(/"/g, '""')}"` },
        status: { label: "Status", getValue: (r) => `"${r.status}"` },
      };

      // Always prefix with Srno if not included
      const activeKeys = requestedCols.includes("srNo") ? requestedCols : ["srNo", ...requestedCols];
      const validKeys = activeKeys.filter((k) => colMap[k]);

      const headers = validKeys.map((k) => colMap[k].label);
      const csvLines = [
        headers.join(","),
        ...filteredRows.map((r) => validKeys.map((k) => colMap[k].getValue(r)).join(",")),
      ];

      // Add summary line
      const totalRow = validKeys.map((k) => {
        if (k === "srNo") return "TOTAL";
        if (k === "customerName") return `"${totalOrders} Orders"`;
        if (k === "amount") return totalRevenue;
        if (k === "quantity") return totalUnits;
        return '""';
      });
      csvLines.push(totalRow.join(","));

      const csvWithBom = "\uFEFF" + csvLines.join("\r\n");
      const filename = `Order_Report_${channelsParam.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;

      return new NextResponse(csvWithBom, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      rows: filteredRows,
      summary: {
        totalOrders,
        totalRevenue,
        totalUnits,
        channelBreakdown,
      },
      availableChannels: ["AMAZON", "FLIPKART", "POS", "WEBSITE", "MEESHO"],
    });
  } catch (error: any) {
    console.error("GET /api/reports/orders-export error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

