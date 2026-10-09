import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Checking database...");

  // 1. Check all sold barcodes
  const soldBarcodes = await prisma.unitBarcode.findMany({
    where: { status: "SOLD" },
    include: {
      productVariant: { include: { product: true } },
      orderItems: { include: { order: true } },
    },
  });

  console.log(`Found ${soldBarcodes.length} sold barcodes.`);

  for (const b of soldBarcodes) {
    const sku = b.productVariant?.sku || "MS-SW136";
    const productName = b.productVariant?.product?.name || "SMART WATCH";
    const price = b.productVariant?.sellingPrice || 1499;
    const orderNumber = "OD338822662590115100";

    // Check if Order exists
    let order = await prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    });

    if (!order) {
      console.log(`Creating missing Order for ${orderNumber}...`);
      order = await prisma.order.create({
        data: {
          orderNumber,
          customerName: "Flipkart Buyer",
          customerEmail: "flipkart.buyer@market.local",
          customerPhone: "+91 98765 43210",
          shippingAddress: "Ekart Logistics Hub, Mumbai, Maharashtra - 400001",
          totalAmount: price,
          status: "Confirmed",
          notes: "Channel: FLIPKART | Payment Status: PAID | Mode: PREPAID | Courier: Ekart Logistics | AWB: FMPC184920489",
          items: {
            create: [
              {
                name: productName,
                sku,
                productVariantId: b.productVariantId,
                unitBarcodeId: b.id,
                quantity: 1,
                unitPrice: price,
                totalPrice: price,
              },
            ],
          },
        },
        include: { items: true },
      });
      console.log(`Created Order ${order.id} (#${order.orderNumber})`);
    } else {
      console.log(`Order ${orderNumber} already exists with ID ${order.id}`);
    }

    // Check if MarketplaceOrder exists
    const mpOrder = await prisma.marketplaceOrder.findUnique({
      where: { channelOrderId: orderNumber },
    });

    if (!mpOrder) {
      console.log(`Creating missing MarketplaceOrder for ${orderNumber}...`);
      await prisma.marketplaceOrder.create({
        data: {
          channel: "FLIPKART",
          channelOrderId: orderNumber,
          buyerName: "Flipkart Buyer",
          shippingAddress: "Ekart Logistics Hub, Mumbai, Maharashtra - 400001",
          totalAmount: price,
          orderStatus: "SHIPPED",
          dispatchedAt: new Date(),
          courier: "Ekart Logistics",
          trackingNumber: "FMPC184920489",
          items: {
            create: [
              {
                channelSku: sku,
                title: productName,
                quantity: 1,
                price,
                scannedBarcode: b.barcode,
                localVariantId: b.productVariantId,
              },
            ],
          },
        },
      });
      console.log(`Created MarketplaceOrder for ${orderNumber}`);
    }

    // Check if Invoice exists
    const inv = await prisma.invoice.findFirst({
      where: { orderId: order.id },
    });

    if (!inv) {
      console.log(`Creating missing Invoice for ${order.id}...`);
      const taxable = price / 1.18;
      const gst = price - taxable;
      await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-FK-${new Date().getFullYear()}-5100`,
          orderId: order.id,
          subtotal: taxable,
          gstRate: 18,
          cgst: gst / 2,
          sgst: gst / 2,
          igst: 0,
          grandTotal: price,
        },
      });
      console.log(`Created Invoice for ${order.id}`);
    }
  }

  const allOrders = await prisma.order.findMany({ include: { items: true } });
  const allMpOrders = await prisma.marketplaceOrder.findMany();
  const allInvoices = await prisma.invoice.findMany();

  console.log("FINAL COUNTS:", {
    orders: allOrders.length,
    marketplaceOrders: allMpOrders.length,
    invoices: allInvoices.length,
  });

  process.exit(0);
}

main().catch((err) => {
  console.error("Error syncing orders:", err);
  process.exit(1);
});
