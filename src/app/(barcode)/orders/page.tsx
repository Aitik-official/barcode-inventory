import { prisma } from "@/lib/prisma";
import { getCompanySettings } from "@/lib/companySettings";
import OrdersClient from "./OrdersClient";

export const revalidate = 0;

export default async function OrdersPage() {
  let orders: any[] = [];
  let marketplaceOrders: any[] = [];
  let quotations: any[] = [];
  let enquiries: any[] = [];
  let invoices: any[] = [];
  let customers: any[] = [];
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
        include: {
          order: {
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
          },
          customer: true,
        },
      }),
      prisma.customer.findMany({
        orderBy: { name: "asc" },
      }),
      getCompanySettings(),
    ]);

    if (results[0].status === "fulfilled") orders = results[0].value;
    if (results[1].status === "fulfilled") marketplaceOrders = results[1].value;
    if (results[2].status === "fulfilled") quotations = results[2].value;
    if (results[3].status === "fulfilled") enquiries = results[3].value;
    if (results[4].status === "fulfilled") invoices = results[4].value;
    if (results[5].status === "fulfilled") customers = results[5].value;
    if (results[6].status === "fulfilled") companySettings = results[6].value;
  } catch (err) {
    console.error("Error loading orders page data:", err);
  }

  return (
    <OrdersClient
      orders={orders}
      marketplaceOrders={marketplaceOrders}
      quotations={quotations}
      enquiries={enquiries}
      invoices={invoices}
      customers={customers}
      initialCompanySettings={companySettings}
    />
  );
}
