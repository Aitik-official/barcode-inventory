import { prisma } from "@/lib/prisma";
import OrdersClient from "./OrdersClient";

export const revalidate = 0;

export default async function OrdersPage() {
  const [orders, marketplaceOrders, quotations, enquiries, invoices, customers] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            productVariant: {
              include: {
                product: true,
              },
            },
            unitBarcode: true,
          },
        },
        customer: true,
      },
    }),
    prisma.marketplaceOrder.findMany({
      orderBy: { orderDate: "desc" },
      include: { items: true, credential: true },
    }),
    prisma.quotation.findMany({
      orderBy: { createdAt: "desc" },
      include: { customer: true },
    }),
    prisma.enquiry.findMany({
      orderBy: { createdAt: "desc" },
      include: { customer: true },
    }),
    prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      include: { order: true, customer: true },
    }),
    prisma.customer.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <OrdersClient
      orders={orders}
      marketplaceOrders={marketplaceOrders}
      quotations={quotations}
      enquiries={enquiries}
      invoices={invoices}
      customers={customers}
    />
  );
}
