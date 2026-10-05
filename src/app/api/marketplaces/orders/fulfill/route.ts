import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pushAmazonInventoryStock } from "@/lib/amazonSpApi";
import { pushFlipkartInventoryStock } from "@/lib/flipkartApi";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, orderItemId, barcode, trackingNumber, courier } = body;

    if (!orderId || !orderItemId || !barcode) {
      return NextResponse.json({
        success: false,
        error: "orderId, orderItemId, and barcode are required for dispatch scan",
      }, { status: 400 });
    }

    const cleanBarcode = barcode.trim();

    // 1. Verify barcode in database
    const unitBarcode = await prisma.unitBarcode.findUnique({
      where: { barcode: cleanBarcode },
      include: { productVariant: true },
    });

    if (!unitBarcode) {
      return NextResponse.json({
        success: false,
        error: `Barcode '${cleanBarcode}' does not exist in your inventory database.`,
      }, { status: 404 });
    }

    if (unitBarcode.status !== "AVAILABLE") {
      return NextResponse.json({
        success: false,
        error: `Barcode '${cleanBarcode}' is currently ${unitBarcode.status} and cannot be assigned to this order.`,
      }, { status: 400 });
    }

    // 2. Find the marketplace order and order item
    const order = await prisma.marketplaceOrder.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        credential: true,
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: "Marketplace order not found" }, { status: 404 });
    }

    const orderItem = order.items.find((i) => i.id === orderItemId);
    if (!orderItem) {
      return NextResponse.json({ success: false, error: "Order item not found" }, { status: 404 });
    }

    // 3. Mark barcode as SOLD
    await prisma.unitBarcode.update({
      where: { id: unitBarcode.id },
      data: {
        status: "SOLD",
        soldAt: new Date(),
        reason: `Dispatched for ${order.channel} Order #${order.channelOrderId}`,
      },
    });

    // 4. Update Inventory available quantity
    const currentInventory = await prisma.inventory.findUnique({
      where: { productVariantId: unitBarcode.productVariantId },
    });

    const previousStock = currentInventory ? currentInventory.quantity : 1;
    const newStock = Math.max(0, previousStock - 1);

    if (currentInventory) {
      await prisma.inventory.update({
        where: { productVariantId: unitBarcode.productVariantId },
        data: { quantity: newStock },
      });
    }

    // 5. Create Inventory Transaction
    await prisma.inventoryTransaction.create({
      data: {
        productVariantId: unitBarcode.productVariantId,
        unitBarcodeId: unitBarcode.id,
        transactionType: "SALE",
        quantity: -1,
        previousStock,
        newStock,
        referenceType: `${order.channel}_ORDER`,
        referenceId: order.channelOrderId,
        note: `Dispatched unit ${cleanBarcode} for ${order.channel} Order #${order.channelOrderId}`,
        performedBy: "Marketplace Dispatch Scanner",
      },
    });

    // 6. Update order item with scanned barcode
    await prisma.marketplaceOrderItem.update({
      where: { id: orderItemId },
      data: {
        scannedBarcode: cleanBarcode,
        localVariantId: unitBarcode.productVariantId,
      },
    });

    // 7. Check if all items in this order are now scanned
    const updatedOrder = await prisma.marketplaceOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    const allScanned = updatedOrder?.items.every((i) => i.id === orderItemId ? true : !!i.scannedBarcode);

    if (allScanned) {
      await prisma.marketplaceOrder.update({
        where: { id: orderId },
        data: {
          orderStatus: "SHIPPED",
          dispatchedAt: new Date(),
          trackingNumber: trackingNumber || order.trackingNumber || `TRK${Date.now().toString().slice(-8)}`,
          courier: courier || order.courier || (order.channel === "AMAZON" ? "Amazon ATS" : "Ekart Logistics"),
        },
      });
    }

    // 8. Auto-Push Updated Available Stock back to Marketplace Channels
    if (order.credential) {
      try {
        if (order.channel === "AMAZON") {
          await pushAmazonInventoryStock(
            {
              appId: order.credential.appId,
              appSecret: order.credential.appSecret,
              refreshToken: order.credential.refreshToken,
              sellerId: order.credential.sellerId,
              marketplaceId: order.credential.marketplaceId,
              sandbox: order.credential.sandbox,
            },
            orderItem.channelSku,
            newStock
          );
        } else if (order.channel === "FLIPKART") {
          await pushFlipkartInventoryStock(
            {
              appId: order.credential.appId,
              appSecret: order.credential.appSecret,
              sellerId: order.credential.sellerId,
              sandbox: order.credential.sandbox,
            },
            orderItem.channelSku,
            newStock,
            orderItem.asinOrFsn || undefined
          );
        }
      } catch (pushErr) {
        console.warn("Auto stock push error after dispatch:", pushErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Barcode '${cleanBarcode}' successfully scanned and deducted! Order marked as ${allScanned ? "SHIPPED" : "PARTIALLY_PACKED"}.`,
      orderStatus: allScanned ? "SHIPPED" : "PROCESSING",
      remainingStock: newStock,
    });
  } catch (error: any) {
    console.error("Fulfill marketplace order error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
