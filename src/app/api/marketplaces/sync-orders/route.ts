import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchAmazonOrdersFromSpApi } from "@/lib/amazonSpApi";
import { fetchFlipkartOrders } from "@/lib/flipkartApi";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { credentialId, channel } = body;

    const where: any = { isActive: true };
    if (credentialId) where.id = credentialId;
    if (channel) where.channel = channel;

    const credentials = await prisma.marketplaceCredential.findMany({ where });

    if (credentials.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No active marketplace credentials found. Please configure Amazon or Flipkart credentials first.",
      }, { status: 400 });
    }

    let totalSynced = 0;
    const errors: string[] = [];

    for (const cred of credentials) {
      try {
        if (cred.channel === "AMAZON") {
          const amzOrders = await fetchAmazonOrdersFromSpApi({
            appId: cred.appId,
            appSecret: cred.appSecret,
            refreshToken: cred.refreshToken,
            sellerId: cred.sellerId,
            marketplaceId: cred.marketplaceId || "A21TJRUUN4KGV",
            sandbox: cred.sandbox,
          });

          for (const order of amzOrders) {
            // Find or link local variant
            const itemsToCreate = [];
            for (const item of (order.OrderItems || [])) {
              // Try to find matching variant by sku
              const mapping = await prisma.marketplaceMapping.findFirst({
                where: {
                  credentialId: cred.id,
                  channelSku: item.SellerSKU,
                },
              });

              let localVariantId = mapping?.productVariantId || null;
              if (!localVariantId) {
                const variant = await prisma.productVariant.findUnique({
                  where: { sku: item.SellerSKU },
                });
                if (variant) localVariantId = variant.id;
              }

              itemsToCreate.push({
                orderItemId: item.OrderItemId,
                channelSku: item.SellerSKU,
                asinOrFsn: item.ASIN,
                title: item.Title,
                quantity: item.QuantityOrdered,
                itemPrice: parseFloat(item.ItemPrice?.Amount || "0"),
                taxPrice: parseFloat(item.ItemTax?.Amount || "0"),
                localVariantId,
              });
            }

            const statusMap: Record<string, string> = {
              Pending: "PENDING",
              Unshipped: "UNSHIPPED",
              PartiallyShipped: "PROCESSING",
              Shipped: "SHIPPED",
              Canceled: "CANCELLED",
            };

            await prisma.marketplaceOrder.upsert({
              where: { channelOrderId: order.AmazonOrderId },
              update: {
                orderStatus: statusMap[order.OrderStatus] || order.OrderStatus.toUpperCase(),
                totalAmount: parseFloat(order.OrderTotal?.Amount || "0"),
                currency: order.OrderTotal?.CurrencyCode || "INR",
                buyerName: order.BuyerInfo?.BuyerName || order.ShippingAddress?.Name,
                buyerCity: order.ShippingAddress?.City,
                buyerState: order.ShippingAddress?.StateOrRegion,
                buyerPincode: order.ShippingAddress?.PostalCode,
                shippingAddress: [
                  order.ShippingAddress?.AddressLine1,
                  order.ShippingAddress?.AddressLine2,
                  order.ShippingAddress?.City,
                  order.ShippingAddress?.StateOrRegion,
                  order.ShippingAddress?.PostalCode,
                ].filter(Boolean).join(", "),
              },
              create: {
                credentialId: cred.id,
                channel: "AMAZON",
                channelOrderId: order.AmazonOrderId,
                orderDate: new Date(order.PurchaseDate),
                orderStatus: statusMap[order.OrderStatus] || order.OrderStatus.toUpperCase(),
                fulfillmentChannel: order.FulfillmentChannel === "AFN" ? "MARKETPLACE" : "MERCHANT",
                totalAmount: parseFloat(order.OrderTotal?.Amount || "0"),
                currency: order.OrderTotal?.CurrencyCode || "INR",
                buyerName: order.BuyerInfo?.BuyerName || order.ShippingAddress?.Name || "Amazon Buyer",
                buyerCity: order.ShippingAddress?.City,
                buyerState: order.ShippingAddress?.StateOrRegion,
                buyerPincode: order.ShippingAddress?.PostalCode,
                shippingAddress: [
                  order.ShippingAddress?.AddressLine1,
                  order.ShippingAddress?.AddressLine2,
                  order.ShippingAddress?.City,
                  order.ShippingAddress?.StateOrRegion,
                  order.ShippingAddress?.PostalCode,
                ].filter(Boolean).join(", "),
                rawPayload: JSON.stringify(order),
                items: {
                  create: itemsToCreate,
                },
              },
            });

            totalSynced++;
          }
        } else if (cred.channel === "FLIPKART") {
          const fkOrders = await fetchFlipkartOrders({
            appId: cred.appId,
            appSecret: cred.appSecret,
            sellerId: cred.sellerId,
            sandbox: cred.sandbox,
          });

          for (const order of fkOrders) {
            const itemsToCreate = [];
            for (const item of order.orderItems) {
              const mapping = await prisma.marketplaceMapping.findFirst({
                where: {
                  credentialId: cred.id,
                  channelSku: item.sku,
                },
              });

              let localVariantId = mapping?.productVariantId || null;
              if (!localVariantId) {
                const variant = await prisma.productVariant.findUnique({
                  where: { sku: item.sku },
                });
                if (variant) localVariantId = variant.id;
              }

              itemsToCreate.push({
                orderItemId: item.orderItemId,
                channelSku: item.sku,
                asinOrFsn: item.fsn,
                title: item.title,
                quantity: item.quantity,
                itemPrice: item.price,
                taxPrice: 0,
                localVariantId,
              });
            }

            const statusMap: Record<string, string> = {
              APPROVED: "UNSHIPPED",
              PACKING_IN_PROGRESS: "PROCESSING",
              READY_TO_DISPATCH: "PROCESSING",
              SHIPPED: "SHIPPED",
              DELIVERED: "DELIVERED",
              CANCELLED: "CANCELLED",
            };

            await prisma.marketplaceOrder.upsert({
              where: { channelOrderId: order.orderId },
              update: {
                orderStatus: statusMap[order.orderStatus] || order.orderStatus,
                totalAmount: order.priceComponents.totalPrice,
                buyerName: order.deliveryAddress?.name,
                buyerCity: order.deliveryAddress?.city,
                buyerState: order.deliveryAddress?.state,
                buyerPincode: order.deliveryAddress?.pincode,
                shippingAddress: [
                  order.deliveryAddress?.address1,
                  order.deliveryAddress?.city,
                  order.deliveryAddress?.state,
                  order.deliveryAddress?.pincode,
                ].filter(Boolean).join(", "),
              },
              create: {
                credentialId: cred.id,
                channel: "FLIPKART",
                channelOrderId: order.orderId,
                orderDate: new Date(order.orderDate),
                orderStatus: statusMap[order.orderStatus] || order.orderStatus,
                fulfillmentChannel: order.fulfillmentType === "FLIPKART_ADVANTAGE" ? "MARKETPLACE" : "MERCHANT",
                totalAmount: order.priceComponents.totalPrice,
                currency: "INR",
                buyerName: order.deliveryAddress?.name || "Flipkart Customer",
                buyerCity: order.deliveryAddress?.city,
                buyerState: order.deliveryAddress?.state,
                buyerPincode: order.deliveryAddress?.pincode,
                shippingAddress: [
                  order.deliveryAddress?.address1,
                  order.deliveryAddress?.city,
                  order.deliveryAddress?.state,
                  order.deliveryAddress?.pincode,
                ].filter(Boolean).join(", "),
                rawPayload: JSON.stringify(order),
                items: {
                  create: itemsToCreate,
                },
              },
            });

            totalSynced++;
          }
        }

        // Update credential lastSyncAt
        await prisma.marketplaceCredential.update({
          where: { id: cred.id },
          data: { lastSyncAt: new Date() },
        });
      } catch (err: any) {
        console.error(`Sync error for ${cred.channel} (${cred.name}):`, err);
        errors.push(`${cred.channel} (${cred.name}): ${err.message}`);
      }
    }

    return NextResponse.json({
      success: errors.length === 0 || totalSynced > 0,
      totalSynced,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully synchronized ${totalSynced} multi-channel orders.`,
    });
  } catch (error: any) {
    console.error("Order sync API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
