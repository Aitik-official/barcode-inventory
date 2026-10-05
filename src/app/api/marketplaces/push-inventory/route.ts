import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pushAmazonInventoryStock } from "@/lib/amazonSpApi";
import { pushFlipkartInventoryStock } from "@/lib/flipkartApi";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { mappingId, credentialId, channel } = body;

    const where: any = {};
    if (mappingId) where.id = mappingId;
    if (credentialId) where.credentialId = credentialId;
    if (channel) where.channel = channel;

    const mappings = await prisma.marketplaceMapping.findMany({
      where,
      include: {
        credential: true,
      },
    });

    if (mappings.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No active SKU mappings found to push inventory stock.",
      }, { status: 400 });
    }

    let successCount = 0;
    const results: Array<{ sku: string; channel: string; stock: number; success: boolean; message: string }> = [];

    for (const mapping of mappings) {
      try {
        // Calculate current available barcode stock
        const availableBarcodes = await prisma.unitBarcode.count({
          where: {
            productVariantId: mapping.productVariantId,
            status: "AVAILABLE",
          },
        });

        // Or fallback to inventory quantity
        let targetStock = availableBarcodes;
        if (targetStock === 0) {
          const inv = await prisma.inventory.findUnique({
            where: { productVariantId: mapping.productVariantId },
          });
          targetStock = inv ? inv.quantity : 0;
        }

        let pushRes: { success: boolean; message: string } = { success: false, message: "" };

        if (mapping.channel === "AMAZON" && mapping.credential) {
          pushRes = await pushAmazonInventoryStock(
            {
              appId: mapping.credential.appId,
              appSecret: mapping.credential.appSecret,
              refreshToken: mapping.credential.refreshToken,
              sellerId: mapping.credential.sellerId,
              marketplaceId: mapping.credential.marketplaceId,
              sandbox: mapping.credential.sandbox,
            },
            mapping.channelSku,
            targetStock
          );
        } else if (mapping.channel === "FLIPKART" && mapping.credential) {
          pushRes = await pushFlipkartInventoryStock(
            {
              appId: mapping.credential.appId,
              appSecret: mapping.credential.appSecret,
              sellerId: mapping.credential.sellerId,
              sandbox: mapping.credential.sandbox,
            },
            mapping.channelSku,
            targetStock,
            mapping.externalId || undefined
          );
        }

        // Update mapping sync status and timestamp
        await prisma.marketplaceMapping.update({
          where: { id: mapping.id },
          data: {
            channelStock: targetStock,
            syncStatus: pushRes.success ? "SYNCED" : "ERROR",
            lastStockPushAt: new Date(),
            lastErrorMessage: pushRes.success ? null : pushRes.message,
          },
        });

        if (pushRes.success) successCount++;

        results.push({
          sku: mapping.channelSku,
          channel: mapping.channel,
          stock: targetStock,
          success: pushRes.success,
          message: pushRes.message,
        });
      } catch (err: any) {
        console.error(`Push failed for SKU ${mapping.channelSku}:`, err);
        results.push({
          sku: mapping.channelSku,
          channel: mapping.channel,
          stock: 0,
          success: false,
          message: err.message,
        });
      }
    }

    return NextResponse.json({
      success: successCount > 0 || results.length === 0,
      totalPushed: successCount,
      totalAttempted: mappings.length,
      results,
      message: `Successfully pushed live stock for ${successCount}/${mappings.length} marketplace listings.`,
    });
  } catch (error: any) {
    console.error("Push inventory stock error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
