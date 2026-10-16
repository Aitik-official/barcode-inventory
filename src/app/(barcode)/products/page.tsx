import { prisma } from "@/lib/prisma";
import ProductsClient from "./ProductsClient";

export const revalidate = 0;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ search?: string; categoryId?: string }> | { search?: string; categoryId?: string };
}) {
  let search = "";
  let categoryId = "";

  try {
    const resolvedParams = searchParams ? (await searchParams) : {};
    search = typeof resolvedParams.search === "string" ? resolvedParams.search.trim() : "";
    categoryId = typeof resolvedParams.categoryId === "string" ? resolvedParams.categoryId.trim() : "";
  } catch (err) {
    console.error("Error reading searchParams in ProductsPage:", err);
  }

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { brand: { contains: search, mode: "insensitive" } },
      { vendor: { contains: search, mode: "insensitive" } },
      { variants: { some: { sku: { contains: search, mode: "insensitive" } } } },
    ];
  }
  if (categoryId) {
    where.categoryId = categoryId;
  }

  let products: any[] = [];
  let categories: any[] = [];

  try {
    const results = await Promise.allSettled([
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

    if (results[0].status === "fulfilled") {
      products = results[0].value || [];
    } else {
      console.error("Products primary query failed:", results[0].reason);
      // Fallback query with simpler relations in case nested relation caused issue
      try {
        products = await prisma.product.findMany({
          where,
          include: {
            category: true,
            variants: true,
          },
          orderBy: { createdAt: "desc" },
        });
      } catch (fallbackErr) {
        console.error("Products fallback query failed:", fallbackErr);
        products = [];
      }
    }

    if (results[1].status === "fulfilled") {
      categories = results[1].value || [];
    } else {
      console.error("Categories primary query failed:", results[1].reason);
      try {
        categories = await prisma.category.findMany({
          orderBy: { name: "asc" },
        });
      } catch (fallbackErr) {
        console.error("Categories fallback query failed:", fallbackErr);
        categories = [];
      }
    }
  } catch (err) {
    console.error("Fatal error loading products page data:", err);
  }

  return (
    <ProductsClient
      products={products}
      categories={categories}
      initialSearch={search}
      initialCategoryId={categoryId}
    />
  );
}

