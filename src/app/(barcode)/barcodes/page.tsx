import { prisma } from "@/lib/prisma";
import UnitBarcodesClient from "./UnitBarcodesClient";

export const revalidate = 0;

export default async function BarcodesPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string; status?: string }> | { search?: string; status?: string };
}) {
  let search = "";
  let status = "ALL";

  try {
    const resolvedParams = searchParams ? (await searchParams) : {};
    search = typeof resolvedParams.search === "string" ? resolvedParams.search.trim() : "";
    status = typeof resolvedParams.status === "string" ? resolvedParams.status.trim() : "ALL";
  } catch (err) {
    console.error("Error reading searchParams in BarcodesPage:", err);
  }

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

  let unitBarcodes: any[] = [];
  let totalCount = 0;
  let availableCount = 0;
  let soldCount = 0;

  try {
    const results = await Promise.allSettled([
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
        take: 300,
      }),
      prisma.unitBarcode.count(),
      prisma.unitBarcode.count({ where: { status: "AVAILABLE" } }),
      prisma.unitBarcode.count({ where: { status: "SOLD" } }),
    ]);

    if (results[0].status === "fulfilled") unitBarcodes = results[0].value || [];
    if (results[1].status === "fulfilled") totalCount = results[1].value || 0;
    if (results[2].status === "fulfilled") availableCount = results[2].value || 0;
    if (results[3].status === "fulfilled") soldCount = results[3].value || 0;
  } catch (err) {
    console.error("Error loading barcodes page data:", err);
  }

  return (
    <UnitBarcodesClient
      unitBarcodes={unitBarcodes}
      stats={{ totalCount, availableCount, soldCount }}
      initialSearch={search}
      initialStatus={status}
    />
  );
}
