import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveActor, writeAudit } from "@/lib/audit";

/**
 * GET /api/fba/tally
 * Retrieves FBA inventory units for 1-click status management and monthly tally.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const channel = searchParams.get("channel") || searchParams.get("division");
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.trim();
    const shipmentId = searchParams.get("shipmentId");

    const where: any = {};

    if (channel && channel !== "ALL") {
      where.fbaTransfer = {
        channel: { equals: channel, mode: "insensitive" },
      };
    }

    if (shipmentId && shipmentId !== "ALL") {
      where.fbaTransferId = shipmentId;
    }

    if (status && status !== "ALL") {
      if (status === "KEPT_IDLE" || status === "KEPT_AT_FBA") {
        where.status = "KEPT_AT_FBA";
      } else if (status === "ORDERED_DELIVERED" || status === "DELIVERED") {
        where.status = "ORDERED_DELIVERED";
      } else if (status === "RETURNED" || status === "RETURNED_TO_WAREHOUSE") {
        where.status = "RETURNED_TO_WAREHOUSE";
      } else {
        where.status = status;
      }
    }

    if (month && month !== "ALL") {
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
            { fbaTransfer: { channel: { contains: search, mode: "insensitive" } } },
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

    // Collect distinct divisions
    const allTransfers = await prisma.fbaTransfer.findMany({
      select: { channel: true },
    });
    const divisionSet = new Set<string>(["Amazon", "Flipkart"]);
    for (const t of allTransfers) {
      if (t.channel) divisionSet.add(t.channel);
    }
    const availableDivisions = Array.from(divisionSet);

    const availableMonths = Array.from(monthsSet).sort().reverse();
    const skuSummary = Object.values(skuMap).sort((a, b) => b.kept - a.kept);

    return NextResponse.json({
      items,
      availableDivisions,
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
 * 1-click status updater and monthly tally:
 * - ORDERED_DELIVERED (Delivered)
 * - RETURNED_TO_WAREHOUSE (Returned)
 * - KEPT_AT_FBA (Kept Idle)
 * - DAMAGED
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      action,
      targetStatus: rawTargetStatus,
      itemIds = [],
      sku,
      quantity,
      tallyMonth,
      notes,
      channelOrderId,
    } = body;

    const actor = resolveActor(req, "Admin Tally");
    const activeMonth = tallyMonth || new Date().toISOString().slice(0, 7);

    // Normalize action or targetStatus
    let targetStatus = rawTargetStatus;
    if (action === "MARK_ORDERED_DELIVERED") targetStatus = "ORDERED_DELIVERED";
    else if (action === "RETURN_TO_WAREHOUSE" || action === "MARK_RETURNED") targetStatus = "RETURNED_TO_WAREHOUSE";
    else if (action === "REVERT_TO_KEPT" || action === "SET_IDLE") targetStatus = "KEPT_AT_FBA";
    else if (action === "MARK_DAMAGED") targetStatus = "DAMAGED";

    // 1. Resolve target item IDs
    let targetIds: string[] = [];

    if (Array.isArray(itemIds) && itemIds.length > 0) {
      targetIds = itemIds;
    } else if (sku && typeof quantity === "number" && quantity > 0) {
      // Quick SKU Tally
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
          { error: `No units kept idle at FBA found for SKU "${sku}".` },
          { status: 400 }
        );
      }

      if (availableItems.length < quantity) {
        return NextResponse.json(
          {
            error: `Only ${availableItems.length} unit(s) of SKU "${sku}" are currently kept idle. Cannot mark ${quantity} units.`,
          },
          { status: 400 }
        );
      }

      targetIds = availableItems.map((i) => i.id);
    } else {
      return NextResponse.json(
        { error: "Please select at least one unit for status update." },
        { status: 400 }
      );
    }

    const targets = await prisma.fbaTransferItem.findMany({
      where: { id: { in: targetIds } },
      include: { fbaTransfer: true },
    });

    const now = new Date();

    // CASE A: ORDERED_DELIVERED
    if (targetStatus === "ORDERED_DELIVERED") {
      for (const item of targets) {
        await prisma.fbaTransferItem.update({
          where: { id: item.id },
          data: {
            status: "ORDERED_DELIVERED",
            tallyMonth: activeMonth,
            tallyDate: now,
            tallyBy: actor,
            tallyNotes: notes || `Marked Delivered (${activeMonth})`,
            channelOrderId: channelOrderId || null,
          },
        });

        // Mark physical unit barcode as SOLD
        if (item.unitBarcodeId) {
          await prisma.unitBarcode.update({
            where: { id: item.unitBarcodeId },
            data: {
              status: "SOLD",
              soldAt: now,
            },
          });
        }

        // Record Sale Transaction
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
            note: `FBA (${item.fbaTransfer.channel}): Unit ${item.barcode} marked Ordered & Delivered`,
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

        await prisma.fbaTransfer.update({
          where: { id: transferId },
          data: {
            soldUnits: soldCount,
            status: soldCount >= totalCount ? "FULLY_RECONCILED" : "PARTIALLY_RECONCILED",
          },
        });
      }

      await writeAudit({
        action: "FBA_TALLY_DELIVERED",
        entity: "INVENTORY",
        details: `Marked ${targets.length} unit(s) as Ordered & Delivered in ${activeMonth}`,
        performedBy: actor,
      });

      return NextResponse.json({
        success: true,
        message: `Marked ${targets.length} unit(s) as Order Delivered!`,
        updatedCount: targets.length,
      });
    }

    // CASE B: RETURNED_TO_WAREHOUSE (Returned)
    if (targetStatus === "RETURNED_TO_WAREHOUSE" || targetStatus === "RETURNED") {
      for (const item of targets) {
        await prisma.fbaTransferItem.update({
          where: { id: item.id },
          data: {
            status: "RETURNED_TO_WAREHOUSE",
            tallyDate: now,
            tallyBy: actor,
            tallyNotes: notes || "Returned / RTO from FBA to local stock",
          },
        });

        if (item.unitBarcodeId) {
          await prisma.unitBarcode.update({
            where: { id: item.unitBarcodeId },
            data: {
              status: "AVAILABLE",
              isReturned: true,
              returnedAt: now,
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
            note: `Unit ${item.barcode} returned from ${item.fbaTransfer.channel} to local retail inventory`,
            performedBy: actor,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Marked ${targets.length} unit(s) as Returned. Restored to local shop stock!`,
        updatedCount: targets.length,
      });
    }

    // CASE C: KEPT_AT_FBA (Kept Idle)
    if (targetStatus === "KEPT_AT_FBA" || targetStatus === "KEPT_IDLE") {
      for (const item of targets) {
        const wasReturned = item.status === "RETURNED_TO_WAREHOUSE";

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

        // If it was returned before, deduct from local available stock again
        if (wasReturned) {
          const availableCount = await prisma.unitBarcode.count({
            where: { productVariantId: item.productVariantId, status: "AVAILABLE" },
          });
          await prisma.inventory.update({
            where: { productVariantId: item.productVariantId },
            data: { quantity: availableCount },
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Marked ${targets.length} unit(s) as Kept Idle in FBA stock.`,
        updatedCount: targets.length,
      });
    }

    // CASE D: DAMAGED
    if (targetStatus === "DAMAGED") {
      for (const item of targets) {
        await prisma.fbaTransferItem.update({
          where: { id: item.id },
          data: {
            status: "DAMAGED",
            tallyDate: now,
            tallyBy: actor,
            tallyNotes: notes || "Damaged/Lost in FC",
          },
        });

        if (item.unitBarcodeId) {
          await prisma.unitBarcode.update({
            where: { id: item.unitBarcodeId },
            data: {
              status: "DAMAGED",
              reason: notes || "Damaged in FC",
            },
          });
        }
      }

      return NextResponse.json({
        success: true,
        message: `Marked ${targets.length} unit(s) as Damaged in FC.`,
        updatedCount: targets.length,
      });
    }

    return NextResponse.json(
      { error: `Unknown status or action "${targetStatus || action}"` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("POST /api/fba/tally error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
