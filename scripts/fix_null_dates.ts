import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Setting true BSON Date using $currentDate in MongoDB...");

  const collections = [
    "Product",
    "ProductVariant",
    "Category",
    "UnitBarcode",
    "Inventory",
    "InventoryTransaction",
    "Customer",
    "Supplier",
    "PurchaseOrder",
    "Order",
    "Quotation",
    "Enquiry",
    "Invoice",
  ];

  for (const colName of collections) {
    try {
      // 1. Fix string or null createdAt / updatedAt using $currentDate operator
      const r1 = await prisma.$runCommandRaw({
        update: colName,
        updates: [
          {
            q: { $or: [{ createdAt: null }, { createdAt: { $type: "string" } }, { createdAt: { $exists: false } }] },
            u: { $currentDate: { createdAt: { $type: "date" } } },
            multi: true,
          },
          {
            q: { $or: [{ updatedAt: null }, { updatedAt: { $type: "string" } }, { updatedAt: { $exists: false } }] },
            u: { $currentDate: { updatedAt: { $type: "date" } } },
            multi: true,
          },
          {
            q: { generatedAt: { $type: "string" } },
            u: { $currentDate: { generatedAt: { $type: "date" } } },
            multi: true,
          },
        ],
      });
      console.log(`Updated dates in ${colName}:`, r1);
    } catch (err: any) {
      console.error(`Error fixing ${colName}:`, err.message);
    }
  }

  // Verify findMany on products and categories
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        variants: {
          include: {
            inventory: true,
            unitBarcodes: { take: 5 },
          },
        },
      },
    });
    console.log(`SUCCESS! Queried ${products.length} products with variants and unit barcodes!`);
  } catch (err: any) {
    console.error("Verification query error:", err.message);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
