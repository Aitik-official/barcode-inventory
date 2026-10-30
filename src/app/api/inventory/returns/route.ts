import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      productVariantId,
      type = "RESTOCK", // "RESTOCK" | "DEFECTIVE"
      quantity = 1,
      unitBarcodeId,
      barcode,
      reason = "Customer Return",
      description = "",
      referenceOrder,
      performedBy = "admin",
    } = body;

    if (!productVariantId) {
      return NextResponse.json(
        { error: "Product variant ID is required" },
        { status: 400 }
      );
    }

    const qty = Math.max(1, Number(quantity) || 1);
    const isDefective = type === "DEFECTIVE";
    const fullNote = [reason, description, referenceOrder ? `Ref Order: #${referenceOrder}` : ""]
      .filter(Boolean)
      .join(" - ");

    // 1. Resolve unit barcode if provided
    let targetBarcode = null;
    if (unitBarcodeId) {
      targetBarcode = await prisma.unitBarcode.findUnique({
        where: { id: unitBarcodeId },
      });
    } else if (barcode) {
      targetBarcode = await prisma.unitBarcode.findUnique({
        where: { barcode: barcode.trim() },
      });
    }

    // 2. Fetch existing inventory
    const currentInv = await prisma.inventory.findUnique({
      where: { productVariantId },
    });
    const prevStock = currentInv?.quantity ?? 0;

    // Check if variant has serialized unit barcodes
    const totalUnitsCount = await prisma.unitBarcode.count({
      where: { productVariantId },
    });

    let updatedWaste = null;
    let newStock = prevStock;

    if (isDefective) {
      // Shifting to DEFECTIVE / DAMAGED piece
      if (targetBarcode) {
        await prisma.unitBarcode.update({
          where: { id: targetBarcode.id },
          data: {
            status: "DAMAGED",
            reason: fullNote || "Defective piece",
          },
        });
      } else if (totalUnitsCount > 0) {
        // Find available barcodes to mark damaged
        const availableUnits = await prisma.unitBarcode.findMany({
          where: { productVariantId, status: "AVAILABLE" },
          take: qty,
        });
        for (const u of availableUnits) {
          await prisma.unitBarcode.update({
            where: { id: u.id },
            data: {
              status: "DAMAGED",
              reason: fullNote || "Defective piece",
            },
          });
        }
      }

      // Sync available stock count
      if (totalUnitsCount > 0) {
        newStock = await prisma.unitBarcode.count({
          where: { productVariantId, status: "AVAILABLE" },
        });
      } else {
        newStock = Math.max(0, prevStock - qty);
      }

      await prisma.inventory.upsert({
        where: { productVariantId },
        update: { quantity: newStock },
        create: { productVariantId, quantity: newStock },
      });

      // Write to Waste table
      updatedWaste = await prisma.waste.create({
        data: {
          productVariantId,
          quantity: qty,
          reason: "DAMAGED",
          description: fullNote || "Defective return / write-off",
          recordedBy: performedBy,
        },
      });

      // Transaction log
      await prisma.inventoryTransaction.create({
        data: {
          productVariantId,
          unitBarcodeId: targetBarcode?.id || null,
          transactionType: "DAMAGE",
          quantity: -qty,
          previousStock: prevStock,
          newStock,
          referenceType: referenceOrder ? "ORDER_RETURN" : "MANUAL_RETURN",
          referenceId: referenceOrder || null,
          note: fullNote || "Defective piece write-off",
          performedBy,
        },
      });
    } else {
      // Shifting to RESTOCK (Good condition / return to sellable stock)
      if (targetBarcode) {
        await prisma.unitBarcode.update({
          where: { id: targetBarcode.id },
          data: {
            status: "AVAILABLE",
            reason: fullNote || "Customer return restocked",
            soldAt: null,
          },
        });
      }

      // Recalculate available stock
      if (totalUnitsCount > 0) {
        newStock = await prisma.unitBarcode.count({
          where: { productVariantId, status: "AVAILABLE" },
        });
      } else {
        newStock = prevStock + qty;
      }

      await prisma.inventory.upsert({
        where: { productVariantId },
        update: { quantity: newStock },
        create: { productVariantId, quantity: newStock },
      });

      // Transaction log
      await prisma.inventoryTransaction.create({
        data: {
          productVariantId,
          unitBarcodeId: targetBarcode?.id || null,
          transactionType: "RETURN",
          quantity: qty,
          previousStock: prevStock,
          newStock,
          referenceType: referenceOrder ? "ORDER_RETURN" : "MANUAL_RETURN",
          referenceId: referenceOrder || null,
          note: fullNote || "Restocked return to inventory",
          performedBy,
        },
      });
    }

    await writeAudit({
      action: isDefective ? "STOCK_DEFECT_RECORDED" : "STOCK_RETURN_RESTOCKED",
      entity: "ProductVariant",
      entityId: productVariantId,
      details: JSON.stringify({
        type,
        quantity: qty,
        unitBarcode: targetBarcode?.barcode,
        previousStock: prevStock,
        newStock,
        reason: fullNote,
      }),
    });

    return NextResponse.json({
      success: true,
      message: isDefective
        ? `Shifted ${qty} unit(s) to Defective Pieces (logged in Waste ledger)`
        : `Restocked ${qty} unit(s) back into Available Warehouse Stock!`,
      newStock,
      waste: updatedWaste,
    });
  } catch (error: any) {
    console.error("POST /api/inventory/returns error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
