import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";

    if (!query) {
      return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
    }

    // 1. Try exact match on UnitBarcode
    const unitBarcodeMatch = await prisma.unitBarcode.findFirst({
      where: { barcode: query },
      include: {
        productVariant: {
          include: {
            product: true,
            inventory: true,
          },
        },
      },
    });

    if (unitBarcodeMatch) {
      return NextResponse.json({
        type: "UNIT_BARCODE",
        match: unitBarcodeMatch,
        unitBarcode: unitBarcodeMatch.barcode,
        serialNumber: unitBarcodeMatch.serialNumber,
        unitStatus: unitBarcodeMatch.status,
        sku: unitBarcodeMatch.productVariant.sku,
        productName: unitBarcodeMatch.productVariant.product.name,
        price: unitBarcodeMatch.productVariant.sellingPrice || unitBarcodeMatch.productVariant.product.offerPrice,
        stockAvailable: unitBarcodeMatch.productVariant.inventory?.quantity ?? 0,
      });
    }

    // 2. Try match on SKU
    const variantMatch = await prisma.productVariant.findFirst({
      where: { sku: query },
      include: {
        product: true,
        inventory: true,
        unitBarcodes: {
          where: { status: "AVAILABLE" },
          orderBy: { serialNumber: "asc" },
        },
      },
    });

    if (variantMatch) {
      const availableUnit = variantMatch.unitBarcodes[0];
      return NextResponse.json({
        type: "VARIANT_SKU",
        match: variantMatch,
        unitBarcode: availableUnit?.barcode || null,
        serialNumber: availableUnit?.serialNumber || null,
        unitStatus: availableUnit ? "AVAILABLE" : "NO_UNITS_LEFT",
        sku: variantMatch.sku,
        productName: variantMatch.product.name,
        price: variantMatch.sellingPrice || variantMatch.product.offerPrice,
        stockAvailable: variantMatch.inventory?.quantity ?? 0,
        availableUnitCount: variantMatch.unitBarcodes.length,
      });
    }

    return NextResponse.json({ error: "No product or unit barcode found matching: " + query }, { status: 404 });
  } catch (error: any) {
    console.error("GET /api/barcodes/lookup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
