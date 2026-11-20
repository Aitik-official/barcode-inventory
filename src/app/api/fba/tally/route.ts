import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveActor, writeAudit } from "@/lib/audit";

/**
 * GET /api/fba/tally
 * Retrieves FBA inventory units for monthly tally and reconciliation.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // e.g. "2026-11" or "ALL"
    const channel = searchParams.get("channel"); // "AMAZON_FBA" | "FLIPKART_FBF" | "ALL"
    const status = searchParams.get("status"); // "KEPT_AT_FBA" | "ORDERED_DELIVERED" | "ALL"
    const search = searchParams.get("search")?.trim();
    const shipmentId = searchParams.get("shipmentId");

    const where: any = {};

    if (channel && channel !== "ALL") {
      where.fbaTransfer = { channel };
    }

    if (shipmentId && shipmentId !== "ALL") {
      where.fbaTransferId = shipmentId;
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (month && month !== "ALL") {
      // If filtering by a specific tally month, match tallyMonth or (if still kept) created in that month
      where.OR = [
        { tallyMonth: month },
        {
          status: "KEPT_AT_FBA",
          createdAt: {
            gte: new Date(`${month}-01T00:00:00.000Z`),
            lt: new Date(
              new Date(`${month}-01T00:00:00.000Z`).setMonth(
                new Date(`${month}-01T00:00:00.000Z`).getMonth() + 1
              )
            ),
          },
        },
      ];
    }

    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { barcode: { contains: search, mode: "insensitive" } },
            { sku: { contains: search, mode: "insensitive" } },
            { productName: { contains: search, mode: "insensitive" } },
            { fbaTransfer: { shipmentNumber: { contains: search, mode: "insensitive" } } },
            { fbaTransfer: { destinationFc: { contains: search, mode: "insensitive" } } },
          ],
        },
      ];
    }

    const items = await prisma.fbaTransferItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 500,
      include: {
        fbaTransfer: {
          select: {
            id: true,
            shipmentNumber: true,
            channel: true,
            destinationFc: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    // Calculate metrics across all items
    const allItems = await prisma.fbaTransferItem.findMany({
      select: {
        id: true,
        status: true,
        sellingPrice: true,
        tallyMonth: true,
        createdAt: true,
        sku: true,
        productName: true,
      },
    });

    let totalTransferred = allItems.length;
    let currentlyKeptAtFba = 0;
    let orderedDelivered = 0;
    let damaged = 0;
    let returnedToWarehouse = 0;
    let totalStockValueKept = 0;
    let totalSalesValue = 0;

    const skuMap: Record<
      string,
      { sku: string; productName: string; total: number; kept: number; sold: number; damaged: number }
    > = {};

    const monthsSet = new Set<string>();
    const currentMonthStr = new Date().toISOString().slice(0, 7); // "2026-11"
    monthsSet.add(currentMonthStr);

    for (const item of allItems) {
      if (item.tallyMonth) monthsSet.add(item.tallyMonth);
      if (item.createdAt) monthsSet.add(item.createdAt.toISOString().slice(0, 7));

      if (item.status === "KEPT_AT_FBA") {
        currentlyKeptAtFba++;
        totalStockValueKept += item.sellingPrice || 0;
      } else if (item.status === "ORDERED_DELIVERED") {
        orderedDelivered++;
        totalSalesValue += item.sellingPrice || 0;
      } else if (item.status === "DAMAGED") {
        damaged++;
      } else if (item.status === "RETURNED_TO_WAREHOUSE") {
        returnedToWarehouse++;
      }

      // Group by SKU
      if (!skuMap[item.sku]) {
        skuMap[item.sku] = {
          sku: item.sku,
          productName: item.productName,
          total: 0,
          kept: 0,
          sold: 0,
          damaged: 0,
        };
      }
      skuMap[item.sku].total++;
      if (item.status === "KEPT_AT_FBA") skuMap[item.sku].kept++;
      if (item.status === "ORDERED_DELIVERED") skuMap[item.sku].sold++;
      if (item.status === "DAMAGED") skuMap[item.sku].damaged++;
    }

    const availableMonths = Array.from(monthsSet).sort().reverse();
    const skuSummary = Object.values(skuMap).sort((a, b) => b.kept - a.kept);

    return NextResponse.json({
      items,
      stats: {
        totalTransferred,
        currentlyKeptAtFba,
        orderedDelivered,
        damaged,
        returnedToWarehouse,
        totalStockValueKept,
        totalSalesValue,
      },
      availableMonths,
      skuSummary,
    });
  } catch (error: any) {
    console.error("GET /api/fba/tally error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/fba/tally
 * Reconcile & tally FBA units:
 * - Mark as ORDERED_DELIVERED (sold/fulfilled via Amazon FBA / Flipkart FBF)
 * - Mark as DAMAGED / LOST in FC
 * - Return to Warehouse (recall back to local stock)
 * - Revert to KEPT_AT_FBA
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      action,
      itemIds = [],
      sku,
      quantity,
      tallyMonth,
      notes,
      channelOrderId,
    } = body;

    const actor = resolveActor(req, "Admin Tally");
    const activeMonth = tallyMonth || new Date().toISOString().slice(0, 7);

    // 1. ACTION: MARK_ORDERED_DELIVERED
    if (action === "MARK_ORDERED_DELIVERED") {
      let targetIds: string[] = [];

      if (Array.isArray(itemIds) && itemIds.length > 0) {
        targetIds = itemIds;
      } else if (sku && typeof quantity === "number" && quantity > 0) {
        // Quick SKU Tally: find available KEPT_AT_FBA items of this SKU
        const availableItems = await prisma.fbaTransferItem.findMany({
          where: {
            sku: sku.trim(),
            status: "KEPT_AT_FBA",
          },
          take: quantity,
          select: { id: true },
        });

        if (availableItems.length === 0) {
          return NextResponse.json(
            { error: `No units kept at FBA found for SKU "${sku}".` },
            { status: 400 }
          );
        }

        if (availableItems.length < quantity) {
          return NextResponse.json(
            {
              error: `Only ${availableItems.length} unit(s) of SKU "${sku}" are currently kept at FBA. Cannot mark ${quantity} units.`,
            },
            { status: 400 }
          );
        }

        targetIds = availableItems.map((i) => i.id);
      } else {
        return NextResponse.json(
          { error: "Please select units or provide SKU and quantity to mark as ordered & delivered." },
          { status: 400 }
        );
      }

      // Fetch the target items with their transfer and unitBarcode
      const targets = await prisma.fbaTransferItem.findMany({
        where: { id: { in: targetIds } },
        include: { fbaTransfer: true },
      });

      const now = new Date();

      // Update each item
      for (const item of targets) {
        await prisma.fbaTransferItem.update({
          where: { id: item.id },
          data: {
            status: "ORDERED_DELIVERED",
            tallyMonth: activeMonth,
            tallyDate: now,
            tallyBy: actor,
            tallyNotes: notes || `Marked Sold & Delivered in ${activeMonth} tally`,
            channelOrderId: channelOrderId || null,
          },
        });

        // Update physical unit barcode to SOLD
        if (item.unitBarcodeId) {
          await prisma.unitBarcode.update({
            where: { id: item.unitBarcodeId },
            data: {
              status: "SOLD",
              soldAt: now,
            },
          });
        }

        // Record InventoryTransaction for reporting and P&L
        await prisma.inventoryTransaction.create({
          data: {
            productVariantId: item.productVariantId,
            unitBarcodeId: item.unitBarcodeId,
            transactionType: "SALE",
            quantity: -1,
            previousStock: 0,
            newStock: 0,
            referenceType: "FBA_ORDER_DELIVERED",
            referenceId: channelOrderId || item.fbaTransfer.shipmentNumber,
            note: `FBA Monthly Tally (${activeMonth}): Unit ${item.barcode} marked ordered/delivered via ${item.fbaTransfer.channel}`,
            performedBy: actor,
          },
        });
      }

      // Update transfer batch sold counts
      const affectedTransfers = Array.from(new Set(targets.map((t) => t.fbaTransferId)));
      for (const transferId of affectedTransfers) {
        const soldCount = await prisma.fbaTransferItem.count({
          where: { fbaTransferId: transferId, status: "ORDERED_DELIVERED" },
        });
        const totalCount = await prisma.fbaTransferItem.count({
          where: { fbaTransferId: transferId },
        });
        const allReconciled = soldCount >= totalCount;

        await prisma.fbaTransfer.update({
          where: { id: transferId },
          data: {
            soldUnits: soldCount,
            status: allReconciled ? "FULLY_RECONCILED" : "PARTIALLY_RECONCILED",
          },
        });
      }

      await writeAudit({
        action: "FBA_TALLY_DELIVERED",
        entity: "INVENTORY",
        details: `Reconciled & marked ${targets.length} FBA units as Ordered / Delivered for month ${activeMonth}`,
        performedBy: actor,
      });

      return NextResponse.json({
        success: true,
        message: `Successfully marked ${targets.length} unit(s) as Ordered & Delivered for month ${activeMonth}.`,
        updatedCount: targets.length,
      });
    }

    // 2. ACTION: MARK_DAMAGED
    if (action === "MARK_DAMAGED") {
      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        return NextResponse.json(
          { error: "Please select at least one unit to mark as damaged/lost." },
          { status: 400 }
        );
      }

      const targets = await prisma.fbaTransferItem.findMany({
        where: { id: { in: itemIds } },
      });

      for (const item of targets) {
        await prisma.fbaTransferItem.update({
          where: { id: item.id },
          data: {
            status: "DAMAGED",
            tallyMonth: activeMonth,
            tallyDate: new Date(),
            tallyBy: actor,
            tallyNotes: notes || "Damaged/Lost in FBA Fulfillment Center",
          },
        });

        if (item.unitBarcodeId) {
          await prisma.unitBarcode.update({
            where: { id: item.unitBarcodeId },
            data: {
              status: "DAMAGED",
              reason: notes || "Damaged/Lost at FBA FC",
            },
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Marked ${targets.length} unit(s) as damaged/lost in FBA warehouse.`,
      });
    }

    // 3. ACTION: RETURN_TO_WAREHOUSE
    if (action === "RETURN_TO_WAREHOUSE") {
      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        return NextResponse.json(
          { error: "Please select at least one unit to return to local warehouse." },
          { status: 400 }
        );
      }

      const targets = await prisma.fbaTransferItem.findMany({
        where: { id: { in: itemIds } },
        include: { fbaTransfer: true },
      });

      for (const item of targets) {
        await prisma.fbaTransferItem.update({
          where: { id: item.id },
          data: {
            status: "RETURNED_TO_WAREHOUSE",
            tallyDate: new Date(),
            tallyBy: actor,
            tallyNotes: notes || "Recalled from FBA back to main warehouse",
          },
        });

        // Set UnitBarcode status back to AVAILABLE
        if (item.unitBarcodeId) {
          await prisma.unitBarcode.update({
            where: { id: item.unitBarcodeId },
            data: {
              status: "AVAILABLE",
              isReturned: true,
              returnedAt: new Date(),
            },
          });
        }

        // Increment Inventory.quantity
        const availableCount = await prisma.unitBarcode.count({
          where: { productVariantId: item.productVariantId, status: "AVAILABLE" },
        });

        const inv = await prisma.inventory.findUnique({
          where: { productVariantId: item.productVariantId },
        });

        await prisma.inventory.update({
          where: { productVariantId: item.productVariantId },
          data: { quantity: availableCount },
        });

        await prisma.inventoryTransaction.create({
          data: {
            productVariantId: item.productVariantId,
            unitBarcodeId: item.unitBarcodeId,
            transactionType: "RETURN",
            quantity: 1,
            previousStock: inv?.quantity ?? 0,
            newStock: availableCount,
            referenceType: "FBA_RETURN",
            referenceId: item.fbaTransfer.shipmentNumber,
            note: `Recalled unit ${item.barcode} from ${item.fbaTransfer.channel} back to local inventory`,
            performedBy: actor,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Successfully returned ${targets.length} unit(s) back to local retail inventory.`,
      });
    }

    // 4. ACTION: REVERT_TO_KEPT
    if (action === "REVERT_TO_KEPT") {
      if (!Array.isArray(itemIds) || itemIds.length === 0) {
        return NextResponse.json({ error: "No items selected." }, { status: 400 });
      }

      const targets = await prisma.fbaTransferItem.findMany({
        where: { id: { in: itemIds } },
      });

      for (const item of targets) {
        await prisma.fbaTransferItem.update({
          where: { id: item.id },
          data: {
            status: "KEPT_AT_FBA",
            tallyMonth: null,
            tallyDate: null,
            tallyNotes: null,
          },
        });

        if (item.unitBarcodeId) {
          await prisma.unitBarcode.update({
            where: { id: item.unitBarcodeId },
            data: {
              status: "FBA_STOCK",
              soldAt: null,
            },
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Reverted ${targets.length} unit(s) back to "Kept at FBA" sitting stock.`,
      });
    }

    return NextResponse.json({ error: `Unknown action "${action}"` }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/fba/tally error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
