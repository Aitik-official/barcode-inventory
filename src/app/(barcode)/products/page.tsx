import { prisma } from "@/lib/prisma";
import ProductsClient from "./ProductsClient";

export const revalidate = 0;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; categoryId?: string }>;
}) {
  const params = await searchParams;
  const search = params.search || "";
  const categoryId = params.categoryId || "";

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { brand: { contains: search } },
      { vendor: { contains: search } },
      { variants: { some: { sku: { contains: search } } } },
    ];
  }
  if (categoryId) {
    where.categoryId = categoryId;
  }

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        variants: {
          include: {
            inventory: true,
            unitBarcodes: {
              take: 5,
              orderBy: { serialNumber: "asc" },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <ProductsClient
      products={products}
      categories={categories}
      initialSearch={search}
      initialCategoryId={categoryId}
    />
  );
}
