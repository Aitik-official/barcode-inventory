import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Fixing Mongo dates using Prisma raw commands...");

  const collections = [
    "Category",
    "Product",
    "ProductVariant",
    "UnitBarcode",
    "Inventory",
    "Customer",
    "Supplier",
    "Order",
    "Quotation",
    "Enquiry",
    "Invoice",
  ];

  for (const colName of collections) {
    try {
      const result = await prisma.$runCommandRaw({
        update: colName,
        updates: [
          {
            q: { createdAt: { $type: "string" } },
            u: [{ $set: { createdAt: { $toDate: "$createdAt" } } }],
            multi: true,
          },
          {
            q: { updatedAt: { $type: "string" } },
            u: [{ $set: { updatedAt: { $toDate: "$updatedAt" } } }],
            multi: true,
          },
        ],
      });
      console.log(`Updated dates for collection ${colName}:`, result);
    } catch (err: any) {
      console.error(`Failed to update ${colName}:`, err.message);
    }
  }

  // Count products and categories to ensure findMany works without error
  try {
    const categoriesCount = await prisma.category.count();
    const productsCount = await prisma.product.count();
    console.log(`Verification: Found ${categoriesCount} categories and ${productsCount} products!`);
  } catch (err: any) {
    console.error("Verification failed:", err.message);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
