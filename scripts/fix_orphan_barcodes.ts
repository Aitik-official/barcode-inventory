import { prisma } from "../src/lib/prisma";

async function fixOrphanedSoldBarcodes() {
  const soldBarcodes = await prisma.unitBarcode.findMany({
    where: { status: "SOLD" },
    include: {
      orderItems: true,
      productVariant: true,
    },
  });

  console.log(`Found ${soldBarcodes.length} sold barcodes.`);

  for (const b of soldBarcodes) {
    if (b.orderItems.length === 0) {
      console.log(`Resetting orphan sold barcode ${b.barcode} (${b.productVariant?.sku}) back to AVAILABLE.`);
      await prisma.unitBarcode.update({
        where: { id: b.id },
        data: { status: "AVAILABLE", soldAt: null },
      });

      // Recalculate inventory
      if (b.productVariantId) {
        const availableCount = await prisma.unitBarcode.count({
          where: { productVariantId: b.productVariantId, status: "AVAILABLE" },
        });

        await prisma.inventory.update({
          where: { productVariantId: b.productVariantId },
          data: { quantity: availableCount },
        });
      }
    } else {
      console.log(`Keeping legitimately sold barcode ${b.barcode} for OrderItem.`);
    }
  }

  const [total, available, sold] = await Promise.all([
    prisma.unitBarcode.count(),
    prisma.unitBarcode.count({ where: { status: "AVAILABLE" } }),
    prisma.unitBarcode.count({ where: { status: "SOLD" } }),
  ]);

  console.log("UPDATED COUNTS:", { total, available, sold });
  process.exit(0);
}

fixOrphanedSoldBarcodes().catch((err) => {
  console.error(err);
  process.exit(1);
});
