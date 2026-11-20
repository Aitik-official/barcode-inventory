import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveActor, writeAudit } from "@/lib/audit";

/**
 * POST /api/fba/transfer
 * Bulk scan and transfer physical units to Amazon, Flipkart, or custom division FBA warehouse.
 * Marks unit barcodes as FBA_STOCK, deducts from local retail inventory, and records transfer batch.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      channel: rawChannel,
      division: rawDivision,
      destinationFc: rawFc,
      shipmentNumber: rawShipment,
      trackingId,
      courier,
      notes,
      barcodes = [],
    } = body;

    const division = (rawDivision || rawChannel || "Amazon").trim();
    const destinationFc = (rawFc || `${division} Fulfillment Center`).trim();

    const actor = resolveActor(req, "Warehouse Admin");

    if (!Array.isArray(barcodes) || barcodes.length === 0) {
      return NextResponse.json(
        { error: "Please scan or enter at least one unit barcode to transfer." },
        { status: 400 }
      );
    }

    // Clean & deduplicate barcodes
    const cleanBarcodes = Array.from(
      new Set(
        barcodes
          .map((b: any) => (typeof b === "string" ? b.trim() : ""))
          .filter((b: string) => b.length > 0)
      )
    );

    if (cleanBarcodes.length === 0) {
      return NextResponse.json(
        { error: "No valid unit barcodes provided." },
        { status: 400 }
      );
    }

    // Auto-generate unique shipment number if not provided
    let shipmentNumber =
      rawShipment && rawShipment.trim() !== ""
        ? rawShipment.trim()
        : `FBA-${division.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)}-${new Date()
            .toISOString()
            .slice(0, 10)
            .replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Verify shipmentNumber uniqueness, adjust if duplicate
    const existingShipment = await prisma.fbaTransfer.findUnique({
      where: { shipmentNumber },
    });
    if (existingShipment) {
      shipmentNumber = `${shipmentNumber}-${Math.floor(100 + Math.random() * 900)}`;
    }

    // Look up all requested unit barcodes
    const unitRecords = await prisma.unitBarcode.findMany({
      where: { barcode: { in: cleanBarcodes } },
      include: {
        productVariant: {
          include: {
            product: true,
            inventory: true,
          },
        },
      },
    });

    const foundBarcodes = new Set(unitRecords.map((u) => u.barcode));
    const missingBarcodes = cleanBarcodes.filter((b) => !foundBarcodes.has(b));

    if (missingBarcodes.length > 0) {
      return NextResponse.json(
        {
          error: `Barcode(s) not found in system: ${missingBarcodes
            .slice(0, 5)
            .join(", ")}${missingBarcodes.length > 5 ? ` (+${missingBarcodes.length - 5} more)` : ""}`,
        },
        { status: 404 }
      );
    }

    // Validate that units are AVAILABLE (not already SOLD or DAMAGED)
    const unavailableUnits = unitRecords.filter(
      (u) => u.status !== "AVAILABLE"
    );
    if (unavailableUnits.length > 0) {
      const summary = unavailableUnits
        .slice(0, 4)
        .map((u) => `${u.barcode} (${u.status})`)
        .join(", ");
      return NextResponse.json(
        {
          error: `Cannot transfer units that are not AVAILABLE: ${summary}${
            unavailableUnits.length > 4 ? ` (+${unavailableUnits.length - 4} more)` : ""
          }`,
        },
        { status: 400 }
      );
    }

    // Create FbaTransfer batch
    const transfer = await prisma.fbaTransfer.create({
      data: {
        shipmentNumber,
        channel: division,
        destinationFc,
        trackingId: trackingId || null,
        courier: courier || `${division} Logistics`,
        status: "IN_FBA_WAREHOUSE",
        totalUnits: unitRecords.length,
        soldUnits: 0,
        damagedUnits: 0,
        returnedUnits: 0,
        transferredBy: actor,
        notes: notes || `Bulk inward of ${unitRecords.length} units to ${division}`,
      },
    });

    // Create FbaTransferItem entries
    const itemsData = unitRecords.map((u) => ({
      fbaTransferId: transfer.id,
      unitBarcodeId: u.id,
      barcode: u.barcode,
      serialNumber: u.serialNumber,
      productVariantId: u.productVariantId,
      sku: u.productVariant.sku,
      productName: u.productVariant.product.name,
      sellingPrice:
        u.productVariant.sellingPrice || u.productVariant.product.offerPrice || 0,
      status: "KEPT_AT_FBA",
    }));

    await prisma.fbaTransferItem.createMany({
      data: itemsData,
    });

    // Mark unit barcodes as FBA_STOCK
    await prisma.unitBarcode.updateMany({
      where: { id: { in: unitRecords.map((u) => u.id) } },
      data: {
        status: "FBA_STOCK",
      },
    });

    // Group units by productVariantId to sync inventory and log transactions
    const variantMap: Record<string, typeof unitRecords> = {};
    for (const u of unitRecords) {
      if (!variantMap[u.productVariantId]) {
        variantMap[u.productVariantId] = [];
      }
      variantMap[u.productVariantId].push(u);
    }

    for (const [variantId, units] of Object.entries(variantMap)) {
      const availableCount = await prisma.unitBarcode.count({
        where: { productVariantId: variantId, status: "AVAILABLE" },
      });

      const inv = await prisma.inventory.findUnique({
        where: { productVariantId: variantId },
      });

      const prevQty = inv?.quantity ?? 0;

      await prisma.inventory.update({
        where: { productVariantId: variantId },
        data: { quantity: availableCount },
      });

      // Record transaction
      await prisma.inventoryTransaction.create({
        data: {
          productVariantId: variantId,
          transactionType: "TRANSFER",
          quantity: -units.length,
          previousStock: prevQty,
          newStock: availableCount,
          referenceType: "FBA_TRANSFER",
          referenceId: transfer.shipmentNumber,
          note: `Transferred ${units.length} units to ${division} (${transfer.shipmentNumber}) - Kept Idle at FBA`,
          performedBy: actor,
        },
      });
    }

    // Log audit
    await writeAudit({
      action: "FBA_STOCK_TRANSFER",
      entity: "INVENTORY",
      entityId: transfer.id,
      details: `Transferred ${unitRecords.length} unit barcodes to ${division} (Shipment: ${shipmentNumber})`,
      performedBy: actor,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully added ${unitRecords.length} unit(s) under division "${division}".`,
      transfer: {
        id: transfer.id,
        shipmentNumber: transfer.shipmentNumber,
        channel: transfer.channel,
        destinationFc: transfer.destinationFc,
        totalUnits: transfer.totalUnits,
        status: transfer.status,
        createdAt: transfer.createdAt,
      },
    });
  } catch (error: any) {
    console.error("POST /api/fba/transfer error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to transfer units to FBA" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/fba/transfer
 * Returns list of FBA transfers and distinct divisions.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const channel = searchParams.get("channel") || searchParams.get("division");
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.trim();

    const where: any = {};
    if (channel && channel !== "ALL") {
      where.channel = { equals: channel, mode: "insensitive" };
    }
    if (status && status !== "ALL") where.status = status;
    if (search) {
      where.OR = [
        { shipmentNumber: { contains: search, mode: "insensitive" } },
        { destinationFc: { contains: search, mode: "insensitive" } },
        { trackingId: { contains: search, mode: "insensitive" } },
      ];
    }

    const transfers = await prisma.fbaTransfer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          select: {
            id: true,
            barcode: true,
            serialNumber: true,
            sku: true,
            productName: true,
            status: true,
            tallyMonth: true,
            sellingPrice: true,
          },
        },
      },
    });

    // Collect all distinct divisions
    const allTransfers = await prisma.fbaTransfer.findMany({
      select: { channel: true },
    });
    const divisionSet = new Set<string>(["Amazon", "Flipkart"]);
    for (const t of allTransfers) {
      if (t.channel) divisionSet.add(t.channel);
    }
    const availableDivisions = Array.from(divisionSet);

    // Calculate aggregated metrics
    const totalTransfers = transfers.length;
    let totalUnitsTransferred = 0;
    let totalUnitsSold = 0;
    let totalUnitsKeptAtFba = 0;
    let totalUnitsDamaged = 0;
    let totalUnitsReturned = 0;

    for (const t of transfers) {
      totalUnitsTransferred += t.totalUnits;
      const kept = t.items.filter((i) => i.status === "KEPT_AT_FBA").length;
      const sold = t.items.filter((i) => i.status === "ORDERED_DELIVERED").length;
      const damaged = t.items.filter((i) => i.status === "DAMAGED").length;
      const returned = t.items.filter((i) => i.status === "RETURNED_TO_WAREHOUSE").length;

      totalUnitsKeptAtFba += kept;
      totalUnitsSold += sold;
      totalUnitsDamaged += damaged;
      totalUnitsReturned += returned;
    }

    return NextResponse.json({
      transfers,
      availableDivisions,
      metrics: {
        totalTransfers,
        totalUnitsTransferred,
        totalUnitsKeptAtFba,
        totalUnitsSold,
        totalUnitsDamaged,
        totalUnitsReturned,
      },
    });
  } catch (error: any) {
    console.error("GET /api/fba/transfer error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
