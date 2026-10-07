import { prisma } from "@/lib/prisma";
import { getCompanySettings } from "@/lib/companySettings";
import InvoicesClient from "./InvoicesClient";

export const revalidate = 0;

export default async function InvoicesPage() {
  const [orders, marketplaceOrders, invoices, companySettings] = await Promise.all([
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
    prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      include: { order: true, customer: true },
    }),
    getCompanySettings(),
  ]);

  return (
    <InvoicesClient
      orders={orders}
      marketplaceOrders={marketplaceOrders}
      invoices={invoices}
      companySettings={companySettings}
    />
  );
}
