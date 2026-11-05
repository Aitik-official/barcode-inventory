import { prisma } from "@/lib/prisma";
import ReportsClient from "./ReportsClient";

export const revalidate = 0;

export default async function ReportsPage() {
  const results = await Promise.allSettled([
    prisma.product.count(),
    prisma.unitBarcode.count(),
    prisma.unitBarcode.count({ where: { status: "AVAILABLE" } }),
    prisma.unitBarcode.count({ where: { status: "SOLD" } }),
    prisma.order.count(),
    prisma.order.aggregate({ _sum: { totalAmount: true } }),
    prisma.product.findMany({
      take: 200,
      include: {
        category: true,
        variants: {
          include: {
            inventory: true,
            unitBarcodes: {
              select: {
                id: true,
                status: true,
                isReturned: true,
                reason: true,
              },
            },
            wasteRecords: {
              select: {
                quantity: true,
              },
            },
            transactions: {
              select: {
                transactionType: true,
                quantity: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totalProducts = results[0].status === "fulfilled" ? results[0].value : 0;
  const totalBarcodes = results[1].status === "fulfilled" ? results[1].value : 0;
  const availableBarcodes = results[2].status === "fulfilled" ? results[2].value : 0;
  const soldBarcodes = results[3].status === "fulfilled" ? results[3].value : 0;
  const totalSalesCount = results[4].status === "fulfilled" ? results[4].value : 0;
  const salesOrders = results[5].status === "fulfilled" ? results[5].value : { _sum: { totalAmount: 0 } };
  const products = results[6].status === "fulfilled" ? results[6].value : [];

  const totalRevenue = salesOrders._sum.totalAmount || 0;

  let srNo = 1;
  const initialRows: any[] = [];
  for (const prod of products) {
    const pVariants = prod.variants && prod.variants.length > 0 ? prod.variants : [];
    for (const v of pVariants) {
      const barcodes = v.unitBarcodes || [];
      const invQty = v.inventory?.quantity ?? 0;
      const availableBarcodes = barcodes.filter((b: any) => b.status === "AVAILABLE").length;
      const closingStock = barcodes.length > 0 ? availableBarcodes : Math.max(0, invQty);

      const soldBarcodes = barcodes.filter((b: any) => b.status === "SOLD").length;
      const soldTxs = (v.transactions || [])
        .filter((t: any) => t.transactionType === "SALE")
        .reduce((sum: number, t: any) => sum + Math.abs(t.quantity), 0);
      const sold = Math.max(soldBarcodes, soldTxs);

      const returnBarcodes = barcodes.filter(
        (b: any) =>
          b.isReturned ||
          (b.reason &&
            (b.reason.toLowerCase().includes("return") ||
              b.reason.toLowerCase().includes("restock")))
      ).length;
      const returnTxs = (v.transactions || [])
        .filter((t: any) => t.transactionType === "RETURN")
        .reduce((sum: number, t: any) => sum + Math.abs(t.quantity), 0);
      const returns = Math.max(returnBarcodes, returnTxs);

      const damagedBarcodes = barcodes.filter((b: any) => b.status === "DAMAGED").length;
      const wasteQty = (v.wasteRecords || []).reduce((sum: number, w: any) => sum + (w.quantity || 0), 0);
      const damageTxs = (v.transactions || [])
        .filter((t: any) => t.transactionType === "DAMAGE")
        .reduce((sum: number, t: any) => sum + Math.abs(t.quantity), 0);
      const damage = Math.max(damagedBarcodes, wasteQty, damageTxs);

      const calculatedOpening = closingStock + sold + damage - returns;
      const openingStock = Math.max(calculatedOpening, barcodes.length, closingStock);

      let stockStatus = "In Stock";
      if (closingStock === 0) {
        stockStatus = "Out of Stock";
      } else if (closingStock <= 5) {
        stockStatus = "Low Stock";
      }

      const price = prod.offerPrice || v.sellingPrice || 0;
      const valuation = closingStock * price;

      initialRows.push({
        srNo: srNo++,
        productName: prod.name,
        sku: v.sku,
        openingStock,
        sold,
        returns,
        damage,
        closingStock,
        stockStatus,
        offerPrice: price,
        valuation,
        category: prod.category?.name || "General",
      });
    }
  }

  const initialSummary = {
    totalItems: initialRows.length,
    totalOpeningStock: initialRows.reduce((sum, r) => sum + r.openingStock, 0),
    totalSold: initialRows.reduce((sum, r) => sum + r.sold, 0),
    totalReturns: initialRows.reduce((sum, r) => sum + r.returns, 0),
    totalDamage: initialRows.reduce((sum, r) => sum + r.damage, 0),
    totalClosingStock: initialRows.reduce((sum, r) => sum + r.closingStock, 0),
    totalValuation: initialRows.reduce((sum, r) => sum + r.valuation, 0),
    inStockCount: initialRows.filter((r) => r.stockStatus === "In Stock").length,
    lowStockCount: initialRows.filter((r) => r.stockStatus === "Low Stock").length,
    outOfStockCount: initialRows.filter((r) => r.stockStatus === "Out of Stock").length,
  };

  return (
    <ReportsClient
      stats={{
        totalProducts,
        totalBarcodes,
        availableBarcodes,
        soldBarcodes,
        totalSalesCount,
        totalRevenue,
      }}
      products={products}
      initialRows={initialRows}
      initialSummary={initialSummary}
    />
  );
}


