import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const [orders, marketplaceOrders, invoices, soldBarcodes] = await Promise.all([
    prisma.order.findMany({
      include: {
        items: true,
        invoices: true,
      },
    }),
    prisma.marketplaceOrder.findMany({
      include: { items: true },
    }),
    prisma.invoice.findMany({
      include: { order: true },
    }),
    prisma.unitBarcode.findMany({
      where: { status: "SOLD" },
      include: {
        productVariant: { include: { product: true } },
        orderItems: { include: { order: true } },
      },
    }),
  ]);

  return NextResponse.json({
    ordersCount: orders.length,
    orders,
    marketplaceOrdersCount: marketplaceOrders.length,
    marketplaceOrders,
    invoicesCount: invoices.length,
    invoices,
    soldBarcodesCount: soldBarcodes.length,
    soldBarcodes,
  });
}
