import { PrismaClient } from "@prisma/client";
import { buildSlug, generateUnitBarcodesForVariant } from "../src/lib/barcode";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting unified database seeding...");

  // 1. Create Categories
  const apparel = await prisma.category.upsert({
    where: { slug: "apparel" },
    create: {
      name: "Apparel & Garments",
      slug: "apparel",
      mainUse: "product",
      description: "Clothing, t-shirts, uniforms, and retail wear",
    },
    update: {},
  });

  const stationery = await prisma.category.upsert({
    where: { slug: "stationery" },
    create: {
      name: "Office Stationery",
      slug: "stationery",
      mainUse: "product",
      description: "Paper, pens, and daily desk supplies",
    },
    update: {},
  });

  const packing = await prisma.category.upsert({
    where: { slug: "packing" },
    create: {
      name: "Packing Supplies",
      slug: "packing",
      mainUse: "product",
      description: "Carton boxes, tapes, and protective wrap",
    },
    update: {},
  });

  const printingService = await prisma.category.upsert({
    where: { slug: "printing-services" },
    create: {
      name: "Printing Services",
      slug: "printing-services",
      mainUse: "service",
      description: "Bulk printing, letterheads, flyers, and banners",
    },
    update: {},
  });

  // 2. Create Products with Variants & Per-Unit Barcodes
  // Product 1: Black T-Shirt
  const tshirtCount = await prisma.product.count({ where: { slug: "black-t-shirt" } });
  if (tshirtCount === 0) {
    const tshirt = await prisma.product.create({
      data: {
        name: "Black T-Shirt",
        slug: "black-t-shirt",
        categoryId: apparel.id,
        brand: "UrbanWear",
        vendor: "TexStyle Corp",
        hsn: "6109",
        mrp: 999,
        offerPrice: 799,
        gstPercent: 5,
        status: "ACTIVE",
        description: "100% Cotton Premium Crew Neck T-Shirt",
        variants: {
          create: [
            {
              sku: "TSHIRT-BLK-M",
              color: "Black",
              size: "M",
              unit: "PCS",
              purchasePrice: 400,
              sellingPrice: 799,
            },
            {
              sku: "TSHIRT-BLK-L",
              color: "Black",
              size: "L",
              unit: "PCS",
              purchasePrice: 420,
              sellingPrice: 799,
            },
          ],
        },
      },
      include: { variants: true },
    });

    // Generate per-unit barcodes for initial quantities!
    for (const variant of tshirt.variants) {
      const initialQty = variant.size === "M" ? 10 : 5;
      await generateUnitBarcodesForVariant({
        productVariantId: variant.id,
        quantity: initialQty,
        generatedBy: "seed",
        note: `Initial seed stock (${initialQty} unit barcodes generated)`,
      });
    }

    console.log("Seeded product: Black T-Shirt (M & L) with unit barcodes!");
  }

  // Product 2: A4 Copier Paper
  const paperCount = await prisma.product.count({ where: { slug: "a4-copier-paper" } });
  if (paperCount === 0) {
    const paper = await prisma.product.create({
      data: {
        name: "A4 Copier Paper",
        slug: "a4-copier-paper",
        categoryId: stationery.id,
        brand: "PaperPro",
        vendor: "Paper Mills India",
        hsn: "4802",
        mrp: 350,
        offerPrice: 280,
        gstPercent: 18,
        status: "ACTIVE",
        description: "500 sheets, 75 GSM high-brightness paper ream",
        variants: {
          create: [
            {
              sku: "A4-PAPER-75GSM",
              color: "White",
              size: "A4",
              unit: "REAM",
              purchasePrice: 200,
              sellingPrice: 280,
            },
          ],
        },
      },
      include: { variants: true },
    });

    for (const variant of paper.variants) {
      await generateUnitBarcodesForVariant({
        productVariantId: variant.id,
        quantity: 12,
        generatedBy: "seed",
        note: "Initial seed stock (12 reams with unit barcodes)",
      });
    }

    console.log("Seeded product: A4 Copier Paper with unit barcodes!");
  }

  // Product 3: Packing Tape
  const tapeCount = await prisma.product.count({ where: { slug: "brown-packing-tape" } });
  if (tapeCount === 0) {
    const tape = await prisma.product.create({
      data: {
        name: "Brown Packing Tape",
        slug: "brown-packing-tape",
        categoryId: packing.id,
        brand: "PackRight",
        vendor: "Adhesive Global",
        hsn: "3919",
        mrp: 90,
        offerPrice: 70,
        gstPercent: 18,
        status: "ACTIVE",
        description: "48 mm x 65m heavy-duty brown box tape roll",
        variants: {
          create: [
            {
              sku: "TAPE-BRN-48MM",
              color: "Brown",
              size: "48MM",
              unit: "ROLL",
              purchasePrice: 40,
              sellingPrice: 70,
            },
          ],
        },
      },
      include: { variants: true },
    });

    for (const variant of tape.variants) {
      await generateUnitBarcodesForVariant({
        productVariantId: variant.id,
        quantity: 15,
        generatedBy: "seed",
        note: "Initial seed stock (15 rolls with unit barcodes)",
      });
    }

    console.log("Seeded product: Brown Packing Tape with unit barcodes!");
  }

  // 3. Create Sample Suppliers
  await prisma.supplier.upsert({
    where: { name: "Paper Mills India" },
    create: {
      name: "Paper Mills India",
      contact: "Rajesh Kumar",
      email: "supplier@papermills.com",
      phone: "+91 98765 43210",
      city: "Mumbai",
      state: "Maharashtra",
      gstin: "27AAACP1234A1Z5",
      notes: "Primary supplier for A4 paper and stationery items",
    },
    update: {},
  });

  // 4. Create Sample Customer
  await prisma.customer.upsert({
    where: { email: "acme.corp@example.com" },
    create: {
      name: "Acme Enterprises",
      username: "acme_corp",
      email: "acme.corp@example.com",
      phone: "+91 91234 56789",
      company: "Acme Enterprises Ltd",
      address: "102 Business Park, MG Road",
      city: "Bengaluru",
      state: "Karnataka",
      zip: "560001",
      gstin: "29ABCDE1234F1Z8",
      status: "ACTIVE",
    },
    update: {},
  });

  console.log("Unified database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
