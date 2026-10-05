import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [totalProducts, totalCategories] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
  ]);

  return NextResponse.json({
    totalProducts,
    totalServices: 0,
    totalCategories,
    totalRevenue: 0,
    totalOrders: 0,
  });
}
