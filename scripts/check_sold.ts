import { prisma } from "../src/lib/prisma";

async function checkSoldBarcodes() {
  const soldBarcodes = await prisma.unitBarcode.findMany({
    where: { status: "SOLD" },
    include: {
      productVariant: {
        include: {
          product: true,
        },
      },
      orderItems: {
        include: {
          order: true,
        },
      },
    },
  });

  console.log("SOLD BARCODES COUNT:", soldBarcodes.length);
  for (const b of soldBarcodes) {
    console.log({
      id: b.id,
      barcode: b.barcode,
      sku: b.productVariant?.sku,
      product: b.productVariant?.product?.name,
      soldAt: b.soldAt,
      reason: b.reason,
      orderItemsCount: b.orderItems.length,
      orderNumber: b.orderItems[0]?.order?.orderNumber,
    });
  }

  process.exit(0);
}

checkSoldBarcodes().catch((err) => {
  console.error(err);
  process.exit(1);
});
