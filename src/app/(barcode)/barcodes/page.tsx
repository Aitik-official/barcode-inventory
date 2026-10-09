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
  const status = params.status || "ALL";

  const where: any = {};
  if (status && status !== "ALL") {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { barcode: { contains: search, mode: "insensitive" } },
      { productVariant: { sku: { contains: search, mode: "insensitive" } } },
      { productVariant: { product: { name: { contains: search, mode: "insensitive" } } } },
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
        orderItems: {
          include: {
            order: true,
          },
        },
      },
      orderBy: [{ generatedAt: "desc" }, { serialNumber: "asc" }],
      take: 2000,
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
