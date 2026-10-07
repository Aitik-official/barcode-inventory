import { prisma } from "@/lib/prisma";
import { getCompanySettings } from "@/lib/companySettings";
import InvoicesClient from "./InvoicesClient";

export const revalidate = 0;

export default async function InvoicesPage() {
  let orders: any[] = [];
  let marketplaceOrders: any[] = [];
  let invoices: any[] = [];
  let companySettings: any = null;

  try {
    const results = await Promise.allSettled([
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

    if (results[0].status === "fulfilled") orders = results[0].value;
    if (results[1].status === "fulfilled") marketplaceOrders = results[1].value;
    if (results[2].status === "fulfilled") invoices = results[2].value;
    if (results[3].status === "fulfilled") companySettings = results[3].value;
  } catch (err) {
    console.error("Error loading invoices page data:", err);
  }

  return (
    <InvoicesClient
      orders={orders}
      marketplaceOrders={marketplaceOrders}
      invoices={invoices}
      companySettings={companySettings}
    />
  );
}
