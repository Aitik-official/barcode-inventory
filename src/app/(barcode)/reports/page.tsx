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
    />
  );
}


