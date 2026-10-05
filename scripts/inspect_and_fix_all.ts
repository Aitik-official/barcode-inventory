import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Inspecting and fixing all collections ===");

  const collections = [
    "Category",
    "Product",
    "ProductVariant",
    "UnitBarcode",
    "Inventory",
    "InventoryTransaction",
    "Customer",
    "Supplier",
    "PurchaseOrder",
    "PurchaseOrderItem",
    "Order",
    "OrderItem",
    "Quotation",
    "Enquiry",
    "Invoice",
    "CustomerStock",
    "Waste",
    "AuditLog",
    "PrintJob",
  ];

  for (const col of collections) {
    try {
      // Find all raw documents in this collection
      const rawDocs = (await prisma.$runCommandRaw({
        find: col,
        filter: {},
      })) as any;

      const docs = rawDocs?.cursor?.firstBatch || [];
      console.log(`Checking ${col} (${docs.length} docs)...`);

      let fixedCount = 0;
      for (const doc of docs) {
        const docId = doc._id;
        const updates: any = {};
        const unsets: any = {};

        // Check date fields
        const dateFields = ["createdAt", "updatedAt", "generatedAt", "soldAt", "expectedDate", "deactivatedAt"];
        for (const field of dateFields) {
          if (doc[field] !== undefined) {
            const val = doc[field];
            // If it is a string or null or not a valid BSON date
            if (typeof val === "string") {
              const parsed = new Date(val);
              if (!isNaN(parsed.getTime())) {
                // In MongoDB raw update pipeline or command
                updates[field] = { $date: parsed.toISOString() };
              }
            } else if (val === null && (field === "createdAt" || field === "updatedAt" || field === "generatedAt")) {
              updates[field] = { $date: new Date().toISOString() };
            }
          } else if (field === "createdAt") {
            updates[field] = { $date: new Date().toISOString() };
          }
        }

        if (Object.keys(updates).length > 0) {
          // Perform update for this document using $set with $currentDate or parsed Date
          await prisma.$runCommandRaw({
            update: col,
            updates: [
              {
                q: { _id: docId },
                u: {
                  $currentDate: {
                    ...Object.keys(updates).reduce((acc: any, k) => {
                      acc[k] = { $type: "date" };
                      return acc;
                    }, {}),
                  },
                },
              },
            ],
          });
          fixedCount++;
        }
      }

      if (fixedCount > 0) {
        console.log(`  -> Fixed ${fixedCount} documents in ${col}`);
      }
    } catch (e: any) {
      console.log(`  -> Error or empty collection ${col}:`, e.message);
    }
  }

  // Test Prisma queries now!
  console.log("\n=== Testing Prisma Queries ===");
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { products: true } },
      },
    });
    console.log(`✅ Category query SUCCESS: ${categories.length} categories found!`);
  } catch (err: any) {
    console.error("❌ Category query failed:", err.message);
  }

  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        variants: {
          include: {
            inventory: true,
            unitBarcodes: { take: 2 },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    console.log(`✅ Product query SUCCESS: ${products.length} products found!`);
  } catch (err: any) {
    console.error("❌ Product query failed:", err.message);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
