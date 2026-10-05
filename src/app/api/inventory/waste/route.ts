import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const wastes = await prisma.waste.findMany({
      include: {
        productVariant: { include: { product: true } },
        supplier: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(wastes);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productVariantId, quantity = 1, reason = "DAMAGED", description } = body;

    if (!productVariantId) {
      return NextResponse.json({ error: "Product variant is required" }, { status: 400 });
    }

    const qty = Math.max(1, Number(quantity) || 1);

    // Find available unit barcodes for this variant and mark as DAMAGED
    const units = await prisma.unitBarcode.findMany({
      where: { productVariantId, status: "AVAILABLE" },
      take: qty,
    });

    for (const unit of units) {
      await prisma.unitBarcode.update({
        where: { id: unit.id },
        data: { status: "DAMAGED", reason },
      });
    }

    // Sync inventory
    const availableCount = await prisma.unitBarcode.count({
      where: { productVariantId, status: "AVAILABLE" },
    });

    const currentInv = await prisma.inventory.findUnique({ where: { productVariantId } });
    const prevStock = currentInv?.quantity ?? 0;

    await prisma.inventory.update({
      where: { productVariantId },
      data: { quantity: availableCount },
    });

    // Write Waste record
    const waste = await prisma.waste.create({
      data: {
        productVariantId,
        quantity: qty,
        reason,
        description: description?.trim() || null,
        recordedBy: "admin",
      },
    });

    // Transaction log
    await prisma.inventoryTransaction.create({
      data: {
        productVariantId,
        transactionType: "DAMAGE",
        quantity: -qty,
        previousStock: prevStock,
        newStock: availableCount,
        note: `Stock Waste Write-off: ${qty} units marked as ${reason}`,
        performedBy: "admin",
      },
    });

    return NextResponse.json(waste, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
