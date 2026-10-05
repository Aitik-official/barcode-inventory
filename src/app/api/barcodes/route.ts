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

/**
 * DELETE /api/barcodes
 * Supports:
 * 1) Removing last N extra units: { productVariantId: string, count: number, reason?: string }
 * 2) Deleting specific unit barcode IDs: { ids: string[] } or ?id=...
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const queryId = searchParams.get("id");

    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const idsToDelete: string[] = body.ids || (queryId ? [queryId] : []);
    const { productVariantId, count, reason } = body;

    // Mode A: Remove last N available unit barcodes for a variant (Reduce Stock)
    if (productVariantId && count && count > 0) {
      const qtyToRemove = Math.max(1, parseInt(count, 10));

      // Find the last N AVAILABLE unit barcodes with highest serial numbers
      const unitsToRemove = await prisma.unitBarcode.findMany({
        where: {
          productVariantId,
          status: "AVAILABLE",
        },
        orderBy: { serialNumber: "desc" },
        take: qtyToRemove,
      });

      if (unitsToRemove.length === 0) {
        return NextResponse.json(
          { error: "No available unit barcodes found to remove." },
          { status: 400 }
        );
      }

      const targetIds = unitsToRemove.map((u) => u.id);
      const serialNumbers = unitsToRemove.map((u) => `#${u.serialNumber}`).reverse();

      // Delete the unit barcodes
      await prisma.unitBarcode.deleteMany({
        where: { id: { in: targetIds } },
      });

      // Recalculate available stock
      const availableCount = await prisma.unitBarcode.count({
        where: { productVariantId, status: "AVAILABLE" },
      });

      const inv = await prisma.inventory.findUnique({ where: { productVariantId } });
      const prevStock = inv?.quantity ?? 0;

      await prisma.inventory.upsert({
        where: { productVariantId },
        create: {
          productVariantId,
          warehouse: "MAIN",
          quantity: availableCount,
        },
        update: {
          quantity: availableCount,
        },
      });

      // Log inventory transaction
      await prisma.inventoryTransaction.create({
        data: {
          productVariantId,
          transactionType: "ADJUSTMENT",
          quantity: -unitsToRemove.length,
          previousStock: prevStock,
          newStock: availableCount,
          note:
            reason ||
            `Removed ${unitsToRemove.length} extra unit barcodes (Serial numbers ${serialNumbers.join(
              ", "
            )} released for reuse)`,
          performedBy: "admin",
        },
      });

      return NextResponse.json({
        success: true,
        message: `Removed ${unitsToRemove.length} unit barcodes. Serial numbers ${serialNumbers.join(", ")} released.`,
        removedCount: unitsToRemove.length,
        removedIds: targetIds,
        newAvailableStock: availableCount,
      });
    }

    // Mode B: Delete specific unit barcodes by ID
    if (idsToDelete.length > 0) {
      const units = await prisma.unitBarcode.findMany({
        where: { id: { in: idsToDelete } },
        include: { productVariant: true },
      });

      if (units.length === 0) {
        return NextResponse.json({ error: "No unit barcodes found to delete" }, { status: 404 });
      }

      const variantIds = Array.from(new Set(units.map((u) => u.productVariantId)));

      // Delete the unit barcodes
      await prisma.unitBarcode.deleteMany({
        where: { id: { in: idsToDelete } },
      });

      // Recalculate stock for each affected variant
      for (const varId of variantIds) {
        const availableCount = await prisma.unitBarcode.count({
          where: { productVariantId: varId, status: "AVAILABLE" },
        });

        const inv = await prisma.inventory.findUnique({ where: { productVariantId: varId } });
        const prevStock = inv?.quantity ?? 0;

        await prisma.inventory.upsert({
          where: { productVariantId: varId },
          create: {
            productVariantId: varId,
            warehouse: "MAIN",
            quantity: availableCount,
          },
          update: {
            quantity: availableCount,
          },
        });

        await prisma.inventoryTransaction.create({
          data: {
            productVariantId: varId,
            transactionType: "ADJUSTMENT",
            quantity: -units.filter((u) => u.productVariantId === varId && u.status === "AVAILABLE").length,
            previousStock: prevStock,
            newStock: availableCount,
            note: reason || `Removed ${units.length} unit barcodes manually`,
            performedBy: "admin",
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Deleted ${units.length} unit barcode(s). Serial numbers released.`,
        deletedCount: units.length,
        deletedIds: idsToDelete,
      });
    }

    return NextResponse.json(
      { error: "Provide either { productVariantId, count } or { ids: string[] }" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("DELETE /api/barcodes error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/barcodes
 * Reset / Reopen unit status (e.g. mark SOLD / DAMAGED unit back to AVAILABLE)
 */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ids, status = "AVAILABLE", reason } = body;

    const targetIds: string[] = ids || (id ? [id] : []);

    if (targetIds.length === 0) {
      return NextResponse.json({ error: "Unit barcode ID(s) required" }, { status: 400 });
    }

    const units = await prisma.unitBarcode.findMany({
      where: { id: { in: targetIds } },
    });

    if (units.length === 0) {
      return NextResponse.json({ error: "No matching unit barcodes found" }, { status: 404 });
    }

    // Update status
    await prisma.unitBarcode.updateMany({
      where: { id: { in: targetIds } },
      data: {
        status,
        soldAt: status === "AVAILABLE" ? null : undefined,
        reason: reason || null,
      },
    });

    const variantIds = Array.from(new Set(units.map((u) => u.productVariantId)));

    // Recalculate stock
    for (const varId of variantIds) {
      const availableCount = await prisma.unitBarcode.count({
        where: { productVariantId: varId, status: "AVAILABLE" },
      });

      const inv = await prisma.inventory.findUnique({ where: { productVariantId: varId } });
      const prevStock = inv?.quantity ?? 0;

      await prisma.inventory.upsert({
        where: { productVariantId: varId },
        create: {
          productVariantId: varId,
          warehouse: "MAIN",
          quantity: availableCount,
        },
        update: {
          quantity: availableCount,
        },
      });

      await prisma.inventoryTransaction.create({
        data: {
          productVariantId: varId,
          transactionType: "ADJUSTMENT",
          quantity: availableCount - prevStock,
          previousStock: prevStock,
          newStock: availableCount,
          note: `Unit status updated to ${status} for ${targetIds.length} item(s)`,
          performedBy: "admin",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${targetIds.length} unit barcode(s) to ${status}.`,
      updatedIds: targetIds,
      newStatus: status,
    });
  } catch (error: any) {
    console.error("PATCH /api/barcodes error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
