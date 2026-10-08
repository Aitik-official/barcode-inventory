import { prisma } from "@/lib/prisma";
import { getHeroBanners } from "@/lib/heroBanner";
import WebsiteClient from "./WebsiteClient";

export const revalidate = 0;

export default async function WebsiteStorefrontPage() {
  let products: any[] = [];
  let categories: any[] = [];
  let heroBanners: any[] = [];

  try {
    const results = await Promise.allSettled([
      prisma.product.findMany({
        include: {
          category: true,
          subCategory: true,
          variants: {
            include: {
              unitBarcodes: true,
            },
          },
        },
        orderBy: { displayOrder: "asc" },
      }),
      prisma.category.findMany({
        orderBy: { name: "asc" },
      }),
      getHeroBanners(),
    ]);

    if (results[0].status === "fulfilled") products = results[0].value;
    if (results[1].status === "fulfilled") categories = results[1].value;
    if (results[2].status === "fulfilled") heroBanners = results[2].value;
  } catch (err) {
    console.error("Error loading website page data:", err);
  }

  return (
    <WebsiteClient
      products={products}
      categories={categories}
      initialHeroBanners={heroBanners}
    />
  );
}
