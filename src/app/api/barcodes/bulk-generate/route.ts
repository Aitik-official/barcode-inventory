import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateUnitBarcodesForVariant } from "@/lib/barcode";

export async function POST() {
  try {
    const variants = await prisma.productVariant.findMany({
      include: { unitBarcodes: true },
    });

    let totalGenerated = 0;

    for (const v of variants) {
      if (v.unitBarcodes.length === 0) {
        const result = await generateUnitBarcodesForVariant({
          productVariantId: v.id,
          quantity: 5, // Default 5 unit barcodes
          generatedBy: "bulk-job",
        });
        totalGenerated += result.count;
      }
    }

    return NextResponse.json({
      message: `Bulk generated ${totalGenerated} missing unit barcodes`,
      count: totalGenerated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
