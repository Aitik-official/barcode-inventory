import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [
    totalProducts,
    totalVariants,
    totalUnitBarcodes,
    availableBarcodes,
    soldBarcodes,
    labelsPrinted,
    totalStock,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.productVariant.count(),
    prisma.unitBarcode.count(),
    prisma.unitBarcode.count({ where: { status: "AVAILABLE" } }),
    prisma.unitBarcode.count({ where: { status: "SOLD" } }),
    prisma.printJob.aggregate({ _sum: { copies: true } }),
    prisma.inventory.aggregate({ _sum: { quantity: true } }),
  ]);

  return NextResponse.json({
    totalProducts,
    totalVariants,
    totalUnitBarcodes,
    availableBarcodes,
    soldBarcodes,
    labelsPrinted: labelsPrinted._sum.copies ?? 0,
    totalStock: totalStock._sum.quantity ?? 0,
  });
}
