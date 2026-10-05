import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateUnitBarcodesForVariant } from "@/lib/barcode";

const schema = z.object({
  variantId: z.string().min(1),
  reason: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { variantId, reason } = schema.parse(await req.json());

    // Retire existing available unit barcodes
    await prisma.unitBarcode.updateMany({
      where: { productVariantId: variantId, status: "AVAILABLE" },
      data: {
        status: "RETIRED",
        deactivatedAt: new Date(),
        reason: reason || "Regenerate requested",
      },
    });

    // Generate fresh series of unit barcodes
    const result = await generateUnitBarcodesForVariant({
      productVariantId: variantId,
      quantity: 5,
      generatedBy: "admin",
      note: reason || "Regenerate barcode series",
    });

    return NextResponse.json({
      message: "Unit barcode series retired and regenerated",
      barcodes: result.barcodes,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
