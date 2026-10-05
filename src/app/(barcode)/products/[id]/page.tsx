import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ProductDetailClient from "./ProductDetailClient";

export const revalidate = 0;

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      variants: {
        include: {
          inventory: true,
          unitBarcodes: {
            orderBy: { serialNumber: "asc" },
          },
          transactions: {
            take: 10,
            orderBy: { createdAt: "desc" },
            include: { unitBarcode: true },
          },
        },
      },
    },
  });

  if (!product) {
    notFound();
  }

  return <ProductDetailClient product={product} />;
}
