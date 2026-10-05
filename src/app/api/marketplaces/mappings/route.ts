import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const mappings = await prisma.marketplaceMapping.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        credential: { select: { name: true, channel: true } },
      },
    });

    // Also get product variants with inventory
    const variants = await prisma.productVariant.findMany({
      include: {
        product: { select: { name: true, brand: true, imageUrl: true } },
        inventory: true,
        _count: {
          select: {
            unitBarcodes: { where: { status: "AVAILABLE" } },
          },
        },
      },
    });

    // Merge variant details into mappings
    const enrichedMappings = mappings.map((m) => {
      const variant = variants.find((v) => v.id === m.productVariantId);
      return {
        ...m,
        variantName: variant ? `${variant.product.name} (${variant.sku})` : "Unknown Product",
        productImage: variant?.product?.imageUrl || null,
        localSku: variant?.sku || "N/A",
        availableBarcodeStock: variant?._count?.unitBarcodes || variant?.inventory?.quantity || 0,
      };
    });

    return NextResponse.json({
      success: true,
      mappings: enrichedMappings,
      variants: variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        name: `${v.product.name} (${v.sku})`,
        sellingPrice: v.sellingPrice,
        availableStock: v._count.unitBarcodes || v.inventory?.quantity || 0,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching mappings:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      credentialId,
      productVariantId,
      channel,
      channelSku,
      externalId,
      title,
      listingPrice,
      fulfillmentType,
    } = body;

    if (!credentialId || !productVariantId || !channelSku) {
      return NextResponse.json({
        success: false,
        error: "Credential, Product Variant, and Channel SKU are required",
      }, { status: 400 });
    }

    if (id) {
      const updated = await prisma.marketplaceMapping.update({
        where: { id },
        data: {
          credentialId,
          productVariantId,
          channel: channel || "AMAZON",
          channelSku,
          externalId: externalId || null,
          title: title || null,
          listingPrice: parseFloat(listingPrice || "0"),
          fulfillmentType: fulfillmentType || "FBM",
        },
      });
      return NextResponse.json({ success: true, mapping: updated });
    } else {
      const created = await prisma.marketplaceMapping.create({
        data: {
          credentialId,
          productVariantId,
          channel: channel || "AMAZON",
          channelSku,
          externalId: externalId || null,
          title: title || null,
          listingPrice: parseFloat(listingPrice || "0"),
          fulfillmentType: fulfillmentType || "FBM",
          syncStatus: "SYNCED",
        },
      });
      return NextResponse.json({ success: true, mapping: created });
    }
  } catch (error: any) {
    console.error("Error saving mapping:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing mapping ID" }, { status: 400 });
    }

    await prisma.marketplaceMapping.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting mapping:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
