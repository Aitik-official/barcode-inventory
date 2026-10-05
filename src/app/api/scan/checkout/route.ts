import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      items,
      customerName = "Walk-in Customer",
      paymentMethod = "CASH",
      notes,
    } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const processedItems = [];
    let totalSaleAmount = 0;

    for (const item of items) {
      const { unitBarcode, sku, price, qty = 1 } = item;

      if (unitBarcode) {
        // Find exact unit barcode
        const unit = await prisma.unitBarcode.findFirst({
          where: { barcode: unitBarcode },
          include: { productVariant: true },
        });

        if (unit) {
          if (unit.status !== "AVAILABLE") {
            return NextResponse.json(
              { error: `Unit barcode ${unitBarcode} is already ${unit.status}` },
              { status: 400 }
            );
          }

          // Mark unit as SOLD
          await prisma.unitBarcode.update({
            where: { id: unit.id },
            data: {
              status: "SOLD",
              soldAt: new Date(),
            },
          });

          // Sync inventory
          const availableCount = await prisma.unitBarcode.count({
            where: { productVariantId: unit.productVariantId, status: "AVAILABLE" },
          });

          const inv = await prisma.inventory.findUnique({
            where: { productVariantId: unit.productVariantId },
          });

          const prevStock = inv?.quantity ?? 0;

          await prisma.inventory.update({
            where: { productVariantId: unit.productVariantId },
            data: { quantity: availableCount },
          });

          // Transaction log
          await prisma.inventoryTransaction.create({
            data: {
              productVariantId: unit.productVariantId,
              unitBarcodeId: unit.id,
              transactionType: "SALE",
              quantity: -1,
              previousStock: prevStock,
              newStock: availableCount,
              note: `POS Sale — Scanned Unit Barcode ${unit.barcode} (Serial #${unit.serialNumber})`,
              performedBy: "cashier",
            },
          });

          const itemPrice = price || unit.productVariant.sellingPrice;
          totalSaleAmount += itemPrice;
          processedItems.push({
            name: (unit.productVariant as any).product?.name || unit.productVariant.sku,
            unitBarcode: unit.barcode,
            unitBarcodeId: unit.id,
            productVariantId: unit.productVariantId,
            serialNumber: unit.serialNumber,
            sku: unit.productVariant.sku,
            price: itemPrice,
          });
        }
      } else if (sku) {
        // Fallback if checked out by SKU: pick first available unit barcode for that SKU
        const variant = await prisma.productVariant.findUnique({
          where: { sku },
          include: {
            product: true,
            unitBarcodes: {
              where: { status: "AVAILABLE" },
              orderBy: { serialNumber: "asc" },
              take: qty,
            },
          },
        });

        if (!variant) {
          return NextResponse.json({ error: `Product variant with SKU ${sku} not found` }, { status: 404 });
        }

        if (variant.unitBarcodes.length < qty) {
          return NextResponse.json(
            { error: `Insufficient available unit barcodes for SKU ${sku}. Stock left: ${variant.unitBarcodes.length}` },
            { status: 400 }
          );
        }

        for (const unit of variant.unitBarcodes) {
          await prisma.unitBarcode.update({
            where: { id: unit.id },
            data: { status: "SOLD", soldAt: new Date() },
          });

          const availableCount = await prisma.unitBarcode.count({
            where: { productVariantId: variant.id, status: "AVAILABLE" },
          });

          const inv = await prisma.inventory.findUnique({ where: { productVariantId: variant.id } });
          const prevStock = inv?.quantity ?? 0;

          await prisma.inventory.update({
            where: { productVariantId: variant.id },
            data: { quantity: availableCount },
          });

          await prisma.inventoryTransaction.create({
            data: {
              productVariantId: variant.id,
              unitBarcodeId: unit.id,
              transactionType: "SALE",
              quantity: -1,
              previousStock: prevStock,
              newStock: availableCount,
              note: `POS Sale — Auto-allocated Unit Barcode ${unit.barcode} for SKU ${sku}`,
              performedBy: "cashier",
            },
          });

          const itemPrice = price || variant.sellingPrice;
          totalSaleAmount += itemPrice;
          processedItems.push({
            name: variant.product?.name || variant.sku,
            unitBarcode: unit.barcode,
            unitBarcodeId: unit.id,
            productVariantId: variant.id,
            serialNumber: unit.serialNumber,
            sku: variant.sku,
            price: itemPrice,
          });
        }
      }
    }

    // Create Order record for tracking with full OrderItems
    const orderCount = await prisma.order.count();
    const orderNumber = `ORD-${String(orderCount + 1).padStart(4, "0")}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerName,
        customerEmail: "pos@store.local",
        totalAmount: totalSaleAmount,
        status: "Delivered",
        notes: notes || `POS Walk-in Barcode Sale [Payment: ${paymentMethod}]`,
        items: {
          create: processedItems.map((item) => ({
            name: item.name || item.sku,
            sku: item.sku,
            productVariantId: item.productVariantId,
            unitBarcodeId: item.unitBarcodeId,
            quantity: 1,
            unitPrice: item.price,
            totalPrice: item.price,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      paymentMethod,
      totalAmount: totalSaleAmount,
      createdAt: order.createdAt,
      itemCount: processedItems.length,
      processedItems,
    });
  } catch (error: any) {
    console.error("POST /api/scan/checkout error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
