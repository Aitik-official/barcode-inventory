import { prisma } from "@/lib/prisma";
import WebsiteClient from "./WebsiteClient";

export const revalidate = 0;

export default async function WebsiteStorefrontPage() {
  const products = await prisma.product.findMany({
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
  });

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return <WebsiteClient products={products} categories={categories} />;
}
