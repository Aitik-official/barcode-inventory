import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    // 1. Create or get Amazon Credential
    let amzCred = await prisma.marketplaceCredential.findFirst({
      where: { channel: "AMAZON" },
    });

    if (!amzCred) {
      amzCred = await prisma.marketplaceCredential.create({
        data: {
          channel: "AMAZON",
          name: "Amazon India (Amazon.in)",
          sellerId: "A3XXXXXXXXX",
          marketplaceId: "A21TJRUUN4KGV",
          appId: "amzn1.application-oa2-client.sandbox-demo",
          appSecret: "amzn1.oa2-cs.v1.sandbox-secret-key-demo",
          refreshToken: "Atzr|IwEBIJ-demo-refresh-token-barcode-inventory",
          sandbox: true,
          isActive: true,
          autoSyncStock: true,
          autoSyncOrders: true,
        },
      });
    }

    // 2. Create or get Flipkart Credential
    let fkCred = await prisma.marketplaceCredential.findFirst({
      where: { channel: "FLIPKART" },
    });

    if (!fkCred) {
      fkCred = await prisma.marketplaceCredential.create({
        data: {
          channel: "FLIPKART",
          name: "Flipkart Seller Hub",
          sellerId: "FK_SELLER_88992",
          appId: "fk_app_id_sandbox_demo",
          appSecret: "fk_app_secret_sandbox_key",
          sandbox: true,
          isActive: true,
          autoSyncStock: true,
          autoSyncOrders: true,
        },
      });
    }

    // 3. Find some existing product variants to create sample mappings
    const variants = await prisma.productVariant.findMany({
      take: 4,
      include: { product: true },
    });

    if (variants.length > 0) {
      for (const variant of variants) {
        // Amazon Mapping
        const existingAmzMap = await prisma.marketplaceMapping.findFirst({
          where: { credentialId: amzCred.id, productVariantId: variant.id },
        });

        if (!existingAmzMap) {
          await prisma.marketplaceMapping.create({
            data: {
              credentialId: amzCred.id,
              productVariantId: variant.id,
              channel: "AMAZON",
              channelSku: variant.sku,
              externalId: `B0${Math.floor(10000000 + Math.random() * 90000000)}`,
              title: variant.product.name,
              listingPrice: variant.sellingPrice || 1999,
              channelStock: 15,
              fulfillmentType: "FBM",
              syncStatus: "SYNCED",
            },
          });
        }

        // Flipkart Mapping
        const existingFkMap = await prisma.marketplaceMapping.findFirst({
          where: { credentialId: fkCred.id, productVariantId: variant.id },
        });

        if (!existingFkMap) {
          await prisma.marketplaceMapping.create({
            data: {
              credentialId: fkCred.id,
              productVariantId: variant.id,
              channel: "FLIPKART",
              channelSku: variant.sku,
              externalId: `FSN${Math.floor(10000000 + Math.random() * 90000000)}`,
              title: variant.product.name,
              listingPrice: variant.sellingPrice ? Math.round(variant.sellingPrice * 0.95) : 1899,
              channelStock: 15,
              fulfillmentType: "SELLER_SMART",
              syncStatus: "SYNCED",
            },
          });
        }
      }
    }

    // 4. Create Sample Orders & Save Customers into directory
    const sampleAmzOrderId = `404-${Math.floor(1000000 + Math.random() * 9000000)}-${Math.floor(1000000 + Math.random() * 9000000)}`;
    const sampleFkOrderId = `OD${Math.floor(1110000000000000 + Math.random() * 8880000000000000)}`;

    const targetVariant = variants[0];

    // Save Amazon Customer into Customer Directory
    try {
      const existingCust = await prisma.customer.findFirst({ where: { email: "rajesh.kumar@amazon-buyer.in" } });
      if (!existingCust) {
        await prisma.customer.create({
          data: {
            name: "Rajesh Kumar",
            username: "rajesh_kumar",
            email: "rajesh.kumar@amazon-buyer.in",
            phone: "+91 98101 23456",
            address: "House 24, Block C, Connaught Place",
            city: "New Delhi",
            state: "Delhi",
            zip: "110001",
            company: "Amazon Retail Direct",
            status: "ACTIVE",
          },
        });
      }
    } catch (_) {}

    // Save Flipkart Customer into Customer Directory
    try {
      const existingCust2 = await prisma.customer.findFirst({ where: { email: "ananya.iyer@flipkart-buyer.in" } });
      if (!existingCust2) {
        await prisma.customer.create({
          data: {
            name: "Ananya Iyer",
            username: "ananya_iyer",
            email: "ananya.iyer@flipkart-buyer.in",
            phone: "+91 98450 78901",
            address: "Flat 304, Palm Grove Heights, Koramangala 4th Block",
            city: "Bengaluru",
            state: "Karnataka",
            zip: "560034",
            company: "Flipkart Consumer Direct",
            status: "ACTIVE",
          },
        });
      }
    } catch (_) {}

    await prisma.marketplaceOrder.create({
      data: {
        credentialId: amzCred.id,
        channel: "AMAZON",
        channelOrderId: sampleAmzOrderId,
        orderDate: new Date(),
        orderStatus: "UNSHIPPED",
        fulfillmentChannel: "MERCHANT",
        buyerName: "Rajesh Kumar",
        buyerCity: "New Delhi",
        buyerState: "Delhi",
        buyerPincode: "110001",
        shippingAddress: "House 24, Block C, Connaught Place, New Delhi, 110001",
        totalAmount: 2499,
        currency: "INR",
        items: {
          create: [
            {
              orderItemId: `amz-item-${Date.now()}`,
              channelSku: targetVariant ? targetVariant.sku : "MINI-CAM-1080P",
              asinOrFsn: "B09ABC1234",
              title: targetVariant ? targetVariant.product.name : "Stealth Mini Spy Camera 1080p HD Night Vision",
              quantity: 1,
              itemPrice: 2499,
              taxPrice: 449.82,
              localVariantId: targetVariant ? targetVariant.id : null,
            },
          ],
        },
      },
    });

    await prisma.marketplaceOrder.create({
      data: {
        credentialId: fkCred.id,
        channel: "FLIPKART",
        channelOrderId: sampleFkOrderId,
        orderDate: new Date(Date.now() - 3600 * 1000),
        orderStatus: "UNSHIPPED",
        fulfillmentChannel: "MERCHANT",
        buyerName: "Ananya Iyer",
        buyerCity: "Bengaluru",
        buyerState: "Karnataka",
        buyerPincode: "560034",
        shippingAddress: "Flat 304, Palm Grove Heights, Koramangala 4th Block, Bengaluru, 560034",
        totalAmount: 1899,
        currency: "INR",
        items: {
          create: [
            {
              orderItemId: `fk-item-${Date.now()}`,
              channelSku: targetVariant ? targetVariant.sku : "MINI-CAM-1080P",
              asinOrFsn: "FSNCAM998822",
              title: targetVariant ? targetVariant.product.name : "Stealth Mini Spy Camera 1080p Wireless DVR",
              quantity: 1,
              itemPrice: 1899,
              taxPrice: 0,
              localVariantId: targetVariant ? targetVariant.id : null,
            },
          ],
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Sample Amazon & Flipkart channels, SKU mappings, and live demo orders generated successfully!",
    });
  } catch (error: any) {
    console.error("Error seeding sample marketplace data:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
