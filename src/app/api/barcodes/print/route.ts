import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getLabelSize } from "@/lib/label-sizes";
import { writeAudit } from "@/lib/audit";

const schema = z.object({
  variantId: z.string().min(1),
  unitBarcode: z.string().optional(),
  copies: z.number().int().min(1).max(500).default(1),
  labelSizeId: z.string().default("50x30"),
  isReprint: z.boolean().optional().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const size = getLabelSize(body.labelSizeId);

    const variant = await prisma.productVariant.findUnique({
      where: { id: body.variantId },
      include: {
        product: true,
        unitBarcodes: { take: 1 },
      },
    });

    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    const targetBarcode = body.unitBarcode || variant.unitBarcodes[0]?.barcode || variant.sku;

    const job = await prisma.printJob.create({
      data: {
        productVariantId: variant.id,
        unitBarcode: targetBarcode,
        copies: body.copies,
        labelWidthMm: size.widthMm,
        labelHeightMm: size.heightMm,
        labelTemplate: "BASIC",
      },
    });

    await writeAudit({
      action: body.isReprint ? "BARCODE_REPRINTED" : "BARCODE_PRINTED",
      entity: "ProductVariant",
      entityId: variant.id,
      details: JSON.stringify({
        unitBarcode: targetBarcode,
        copies: body.copies,
        size: size.label,
        printJobId: job.id,
      }),
    });

    return NextResponse.json({
      printJobId: job.id,
      unitBarcode: targetBarcode,
      copies: body.copies,
      labelSize: size,
      productName: variant.product.name,
      sku: variant.sku,
      price: variant.sellingPrice,
      isReprint: body.isReprint,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Print job failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
