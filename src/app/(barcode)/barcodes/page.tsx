import { prisma } from "@/lib/prisma";
import UnitBarcodesClient from "./UnitBarcodesClient";

export const revalidate = 0;

export default async function BarcodesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const status = params.status || "";

  const where: any = {};
  if (status) {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { barcode: { contains: search } },
      { productVariant: { sku: { contains: search } } },
      { productVariant: { product: { name: { contains: search } } } },
    ];
  }

  const [unitBarcodes, totalCount, availableCount, soldCount] = await Promise.all([
    prisma.unitBarcode.findMany({
      where,
      include: {
        productVariant: {
          include: {
            product: true,
          },
        },
      },
      orderBy: [{ generatedAt: "desc" }, { serialNumber: "asc" }],
      take: 1000,
    }),
    prisma.unitBarcode.count(),
    prisma.unitBarcode.count({ where: { status: "AVAILABLE" } }),
    prisma.unitBarcode.count({ where: { status: "SOLD" } }),
  ]);

  return (
    <UnitBarcodesClient
      unitBarcodes={unitBarcodes}
      stats={{ totalCount, availableCount, soldCount }}
      initialSearch={search}
      initialStatus={status}
    />
  );
}
