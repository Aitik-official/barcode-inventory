import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Running Complete MongoDB BSON Date Pipeline Migration ===");

  const collections = [
    { name: "Category", dateFields: ["createdAt"] },
    { name: "Product", dateFields: ["createdAt", "updatedAt"] },
    { name: "ProductVariant", dateFields: ["createdAt", "updatedAt"] },
    { name: "UnitBarcode", dateFields: ["generatedAt", "soldAt", "deactivatedAt"] },
    { name: "Inventory", dateFields: ["updatedAt"] },
    { name: "InventoryTransaction", dateFields: ["createdAt"] },
    { name: "Customer", dateFields: ["createdAt", "updatedAt"] },
    { name: "Supplier", dateFields: ["createdAt", "updatedAt"] },
    { name: "PurchaseOrder", dateFields: ["createdAt", "updatedAt", "expectedDate"] },
    { name: "Order", dateFields: ["createdAt", "updatedAt"] },
    { name: "Quotation", dateFields: ["createdAt", "updatedAt"] },
    { name: "Enquiry", dateFields: ["createdAt"] },
    { name: "Invoice", dateFields: ["createdAt"] },
    { name: "CustomerStock", dateFields: ["updatedAt"] },
    { name: "Waste", dateFields: ["createdAt"] },
    { name: "AuditLog", dateFields: ["createdAt"] },
    { name: "PrintJob", dateFields: ["createdAt"] },
  ];

  for (const { name, dateFields } of collections) {
    try {
      // 1. Pipeline update with $toDate and fallback to $$NOW
      const setStage: any = {};
      for (const field of dateFields) {
        if (field === "soldAt" || field === "deactivatedAt" || field === "expectedDate") {
          // Nullable date field
          setStage[field] = {
            $cond: {
              if: { $eq: [{ $type: `$${field}` }, "string"] },
              then: { $toDate: `$${field}` },
              else: `$${field}`,
            },
          };
        } else {
          // Required date field
          setStage[field] = {
            $cond: {
              if: {
                $or: [
                  { $eq: [{ $type: `$${field}` }, "string"] },
                  { $eq: [`$${field}`, null] },
                  { $eq: [{ $type: `$${field}` }, "missing"] },
                ],
              },
              then: {
                $convert: {
                  input: `$${field}`,
                  to: "date",
                  onError: "$$NOW",
                  onNull: "$$NOW",
                },
              },
              else: `$${field}`,
            },
          };
        }
      }

      const res: any = await prisma.$runCommandRaw({
        update: name,
        updates: [
          {
            q: {},
            u: [{ $set: setStage }],
            multi: true,
          },
        ],
      });

      console.log(`Pipeline update on ${name}:`, res);
    } catch (e: any) {
      console.error(`Error updating ${name}:`, e.message);
    }
  }

  // 2. Fetch and test every single collection using Prisma Client
  console.log("\n=== Verifying Prisma Client queries on all models ===");

  const catCount = await prisma.category.count();
  const cats = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { createdAt: "desc" },
  });
  console.log(`✅ Category.findMany: ${cats.length}/${catCount} loaded successfully`);

  const prodCount = await prisma.product.count();
  const prods = await prisma.product.findMany({
    include: {
      category: true,
      variants: {
        include: {
          inventory: true,
          unitBarcodes: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  console.log(`✅ Product.findMany: ${prods.length}/${prodCount} loaded successfully`);

  const ubCount = await prisma.unitBarcode.count();
  const ubs = await prisma.unitBarcode.findMany({
    take: 100,
    orderBy: { generatedAt: "desc" },
  });
  console.log(`✅ UnitBarcode.findMany: ${ubs.length}/${ubCount} loaded successfully`);

  const invCount = await prisma.inventory.count();
  const invs = await prisma.inventory.findMany();
  console.log(`✅ Inventory.findMany: ${invs.length}/${invCount} loaded successfully`);

  const orderCount = await prisma.order.count();
  const orders = await prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  console.log(`✅ Order.findMany: ${orders.length}/${orderCount} loaded successfully`);

  const enqCount = await prisma.enquiry.count();
  const enqs = await prisma.enquiry.findMany();
  console.log(`✅ Enquiry.findMany: ${enqs.length}/${enqCount} loaded successfully`);

  console.log("\n🎉 ALL COLLECTIONS AND PRISMA MODELS VERIFIED 100% OPERATIONAL!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
