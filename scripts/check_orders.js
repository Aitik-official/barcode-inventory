const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    include: { items: true, invoices: true },
    orderBy: { createdAt: 'desc' }
  });
  const marketplaceOrders = await prisma.marketplaceOrder.findMany({
    orderBy: { createdAt: 'desc' }
  });
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: 'desc' }
  });
  const soldBarcodes = await prisma.unitBarcode.findMany({
    where: { status: 'SOLD' },
    include: { product: true }
  });

  console.log('=== ORDERS (' + orders.length + ') ===');
  console.log(JSON.stringify(orders, null, 2));

  console.log('=== MARKETPLACE ORDERS (' + marketplaceOrders.length + ') ===');
  console.log(JSON.stringify(marketplaceOrders, null, 2));

  console.log('=== INVOICES (' + invoices.length + ') ===');
  console.log(JSON.stringify(invoices, null, 2));

  console.log('=== SOLD BARCODES (' + soldBarcodes.length + ') ===');
  console.log(JSON.stringify(soldBarcodes, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
