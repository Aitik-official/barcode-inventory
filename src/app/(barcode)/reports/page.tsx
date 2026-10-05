import { prisma } from "@/lib/prisma";
import ReportsClient from "./ReportsClient";

export const revalidate = 0;

export default async function ReportsPage() {
  const [
    totalProducts,
    totalBarcodes,
    availableBarcodes,
    soldBarcodes,
    totalSalesCount,
    salesOrders,
    products,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.unitBarcode.count(),
    prisma.unitBarcode.count({ where: { status: "AVAILABLE" } }),
    prisma.unitBarcode.count({ where: { status: "SOLD" } }),
    prisma.order.count(),
    prisma.order.aggregate({ _sum: { totalAmount: true } }),
    prisma.product.findMany({
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


