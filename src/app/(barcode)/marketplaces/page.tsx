import { prisma } from "@/lib/prisma";
import MarketplacesClient from "./MarketplacesClient";

export const dynamic = "force-dynamic";

export default async function MarketplacesPage() {
  const results = await Promise.allSettled([
    prisma.marketplaceCredential.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.marketplaceMapping.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        credential: { select: { name: true, channel: true } },
      },
    }),
    prisma.marketplaceOrder.findMany({
      orderBy: { orderDate: "desc" },
      take: 100,
      include: {
        credential: { select: { name: true, channel: true } },
        items: true,
      },
    }),
    prisma.productVariant.findMany({
      include: {
        product: { select: { name: true, brand: true, imageUrl: true } },
        inventory: true,
        _count: {
          select: {
            unitBarcodes: { where: { status: "AVAILABLE" } },
          },
        },
      },
    }),
  ]);

  const credentials = results[0].status === "fulfilled" ? results[0].value : [];
  const mappings = results[1].status === "fulfilled" ? results[1].value : [];
  const orders = results[2].status === "fulfilled" ? results[2].value : [];
  const variants = results[3].status === "fulfilled" ? results[3].value : [];

  // Mask secrets
  const sanitizedCredentials = credentials.map((c) => ({
    ...c,
    appSecret: c.appSecret ? "••••••••••••" + c.appSecret.slice(-4) : "",
    refreshToken: c.refreshToken ? "••••••••••••" + c.refreshToken.slice(-4) : "",
  }));

  // Enriched Mappings
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

  const simpleVariants = variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    name: `${v.product.name} (${v.sku})`,
    brand: v.product.brand || "Stealth Sight",
    sellingPrice: v.sellingPrice,
    availableStock: v._count.unitBarcodes || v.inventory?.quantity || 0,
  }));

  return (
    <MarketplacesClient
      initialCredentials={sanitizedCredentials}
      initialMappings={enrichedMappings}
      initialOrders={orders}
      variants={simpleVariants}
    />
  );
}
