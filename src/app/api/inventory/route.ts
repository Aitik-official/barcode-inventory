import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

export async function GET() {
  const inventory = await prisma.inventory.findMany({
    include: {
      productVariant: { include: { product: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(inventory);
}

const adjustSchema = z.object({
  variantId: z.string(),
  quantity: z.number().int(),
  type: z.enum(["RECEIVE", "SALE", "RETURN", "ADJUST", "DAMAGE"]),
  note: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = adjustSchema.parse(await req.json());

    const inv = await prisma.inventory.findUnique({
      where: { productVariantId: body.variantId },
    });

    if (!inv) {
      return NextResponse.json({ error: "Inventory not found" }, { status: 404 });
    }

    const delta =
      body.type === "SALE" || body.type === "DAMAGE"
        ? -Math.abs(body.quantity)
        : body.type === "ADJUST"
          ? body.quantity
          : Math.abs(body.quantity);

    const previousStock = inv.quantity;
    const newStock = previousStock + delta;

    if (newStock < 0) {
      return NextResponse.json(
        {
          error: `Insufficient stock. Available quantity: ${previousStock}`,
        },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.inventory.update({
        where: { productVariantId: body.variantId },
        data: { quantity: newStock },
        include: { productVariant: { include: { product: true } } },
      });

      await tx.inventoryTransaction.create({
        data: {
          productVariantId: body.variantId,
          transactionType: body.type,
          quantity: Math.abs(body.quantity),
          previousStock,
          newStock,
          note: body.note,
        },
      });

      return updated;
    });

    await writeAudit({
      action: "STOCK_ADJUSTED",
      entity: "ProductVariant",
      entityId: body.variantId,
      details: JSON.stringify({
        type: body.type,
        previousStock,
        newStock,
        quantity: body.quantity,
      }),
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Inventory update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
