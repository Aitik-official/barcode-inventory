import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

const lineSchema = z.object({
  variantId: z.string(),
  quantity: z.number().int().min(1),
});

const schema = z.object({
  lines: z.array(lineSchema).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const { lines } = schema.parse(await req.json());

    const orderId = `ORD-${Date.now()}`;

    await prisma.$transaction(async (tx) => {
      for (const line of lines) {
        const inv = await tx.inventory.findUnique({
          where: { productVariantId: line.variantId },
        });
        if (!inv) throw new Error("Inventory not found for a cart item");

        const previousStock = inv.quantity;
        const newStock = previousStock - line.quantity;
        if (newStock < 0) {
          throw new Error(
            `Insufficient stock. Available quantity: ${previousStock}`
          );
        }

        await tx.inventory.update({
          where: { productVariantId: line.variantId },
          data: { quantity: newStock },
        });

        await tx.inventoryTransaction.create({
          data: {
            productVariantId: line.variantId,
            transactionType: "SALE",
            quantity: line.quantity,
            previousStock,
            newStock,
            referenceType: "ORDER",
            referenceId: orderId,
          },
        });
      }
    });

    await writeAudit({
      action: "SALE_CREATED",
      entity: "Order",
      entityId: orderId,
      details: JSON.stringify({ lines }),
    });

    return NextResponse.json({ orderId, status: "COMPLETED", lines });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sale failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
