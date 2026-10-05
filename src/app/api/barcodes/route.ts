import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateUnitBarcodesForVariant } from "@/lib/barcode";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const variantId = searchParams.get("variantId") || "";

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (variantId) {
      where.productVariantId = variantId;
    }
    if (search) {
      where.OR = [
        { barcode: { contains: search } },
        { productVariant: { sku: { contains: search } } },
        { productVariant: { product: { name: { contains: search } } } },
      ];
    }

    const unitBarcodes = await prisma.unitBarcode.findMany({
      where,
      include: {
        productVariant: {
          include: {
            product: true,
          },
        },
      },
      orderBy: [{ generatedAt: "desc" }, { serialNumber: "asc" }],
      take: 200,
    });

    return NextResponse.json(unitBarcodes);
  } catch (error: any) {
    console.error("GET /api/barcodes error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productVariantId, quantity = 1, note } = body;

    if (!productVariantId) {
      return NextResponse.json({ error: "Product variant ID is required" }, { status: 400 });
    }

    const qty = Math.max(1, Number(quantity) || 1);

    const result = await generateUnitBarcodesForVariant({
      productVariantId,
      quantity: qty,
      generatedBy: "admin",
      note: note || `Added ${qty} new unit barcodes`,
    });

    return NextResponse.json({
      message: `Generated ${result.count} new per-unit barcodes`,
      barcodes: result.barcodes,
    });
  } catch (error: any) {
    console.error("POST /api/barcodes error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
