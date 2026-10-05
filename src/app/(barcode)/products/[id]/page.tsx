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

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        subCategory: true,
        level2Category: true,
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
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  if (!product) {
    notFound();
  }

  return <ProductDetailClient initialProduct={product} categories={categories} />;
}
