import { prisma } from "@/lib/prisma";
import InventoryClient from "./InventoryClient";

export const revalidate = 0;

export default async function InventoryPage() {
  const [inventories, transactions, purchaseOrders, wastes, suppliers, variants, marketplaceMappings] = await Promise.all([
    prisma.inventory.findMany({
      include: {
        productVariant: {
          include: {
            product: true,
            unitBarcodes: { where: { status: "AVAILABLE" } },
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
