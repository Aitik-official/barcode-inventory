import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateUnitBarcodesForVariant } from "@/lib/barcode";

const schema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().optional().default(1),
});

export async function POST(req: NextRequest) {
  try {
    const { variantId, quantity } = schema.parse(await req.json());

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    const result = await generateUnitBarcodesForVariant({
      productVariantId: variantId,
      quantity: Math.max(1, quantity),
      generatedBy: "api",
    });

    return NextResponse.json({
      message: `Generated ${result.count} unit barcodes`,
      barcodes: result.barcodes,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generate failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
