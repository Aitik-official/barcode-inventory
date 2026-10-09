import { prisma } from '../src/lib/prisma';

async function main() {
  const orders = await prisma.order.findMany({
    include: { items: true, invoices: true },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  const marketplaceOrders = await prisma.marketplaceOrder.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  const soldBarcodes = await prisma.unitBarcode.findMany({
    where: { status: 'SOLD' },
    include: {
      productVariant: {
        include: {
          product: true,
        },
      },
    },
  });

  console.log('=== ORDERS COUNT ===', orders.length);
  console.log(JSON.stringify(orders, null, 2));

  console.log('=== MARKETPLACE ORDERS COUNT ===', marketplaceOrders.length);
  console.log(JSON.stringify(marketplaceOrders, null, 2));

  console.log('=== INVOICES COUNT ===', invoices.length);
  console.log(JSON.stringify(invoices, null, 2));

  console.log('=== SOLD BARCODES COUNT ===', soldBarcodes.length);
  console.log(JSON.stringify(soldBarcodes, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
