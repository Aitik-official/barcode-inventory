import { prisma } from "@/lib/prisma";
import InventoryClient from "./InventoryClient";

export const revalidate = 0;

export default async function InventoryPage() {
  let inventories: any[] = [];
  let transactions: any[] = [];
  let purchaseOrders: any[] = [];
  let wastes: any[] = [];
  let suppliers: any[] = [];
  let variants: any[] = [];
  let marketplaceMappings: any[] = [];

  try {
    const results = await Promise.allSettled([
      prisma.inventory.findMany({
        include: {
          productVariant: {
            include: {
              product: true,
              unitBarcodes: { where: { status: "AVAILABLE" }, take: 20 },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.inventoryTransaction.findMany({
        take: 50,
        orderBy: { createdAt: "desc" },
        include: {
          productVariant: { include: { product: true } },
          unitBarcode: true,
        },
      }),
      prisma.purchaseOrder.findMany({
        include: { supplier: true, items: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.waste.findMany({
        include: {
          productVariant: { include: { product: true } },
          supplier: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.supplier.findMany({ orderBy: { name: "asc" } }),
      prisma.productVariant.findMany({
        include: { product: true },
        orderBy: { sku: "asc" },
      }),
      prisma.marketplaceMapping.findMany({
        include: { credential: true },
      }),
    ]);

    if (results[0].status === "fulfilled") inventories = results[0].value || [];
    if (results[1].status === "fulfilled") transactions = results[1].value || [];
    if (results[2].status === "fulfilled") purchaseOrders = results[2].value || [];
    if (results[3].status === "fulfilled") wastes = results[3].value || [];
    if (results[4].status === "fulfilled") suppliers = results[4].value || [];
    if (results[5].status === "fulfilled") variants = results[5].value || [];
    if (results[6].status === "fulfilled") marketplaceMappings = results[6].value || [];
  } catch (err) {
    console.error("Error loading inventory page data:", err);
  }

  return (
    <InventoryClient
      inventories={inventories}
      transactions={transactions}
      purchaseOrders={purchaseOrders}
      wastes={wastes}
      suppliers={suppliers}
      variants={variants}
      marketplaceMappings={marketplaceMappings}
    />
  );
}
