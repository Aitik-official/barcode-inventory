import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding sample products with per-unit barcodes for portal & website...");

  // 1. Create or find Category
  let category = await prisma.category.findUnique({ where: { name: "Security Gadgets" } });
  if (!category) {
    category = await prisma.category.create({
      data: {
        name: "Security Gadgets",
        slug: "security-gadgets",
        description: "Consumer electronics standards applied to security gadgets — bench-tested in our lab.",
        mainUse: "product",
      },
    });
  }

  let subCategory = await prisma.category.findUnique({ where: { name: "Smart Cameras & Sensors" } });
  if (!subCategory) {
    subCategory = await prisma.category.create({
      data: {
        name: "Smart Cameras & Sensors",
        slug: "smart-cameras-sensors",
        description: "Bench-tested hardware with pairing that works on 2.4GHz WiFi.",
        parentId: category.id,
        mainUse: "product",
      },
    });
  }

  const sampleProducts = [
    {
      name: "Micawas Pro 4K WiFi Outdoor Security Camera",
      slug: "micawas-pro-4k-wifi-outdoor-security-camera",
      description: "Bench-tested hardware. WiFi devices pair in under 3 minutes on 2.4GHz with plain-English quick-start cards. 42-point lab check passed.",
      brand: "Micawas",
      vendor: "Micawas Labs",
      hsn: "85258090",
      mrp: 6999,
      offerPrice: 4999,
      gstPercent: 18,
      status: "ACTIVE",
      productType: "PRODUCT",
      showOnWebsite: true,
      featured: true,
      tags: "camera,outdoor,wifi,4k,security",
      imageUrl: "https://res.cloudinary.com/drxzuvrbq/image/upload/v1790650000/barcode-inventory/micawas_camera.png",
      variants: [
        {
          sku: "MICA-CAM-4K-BLK",
          color: "Matte Black",
          size: "Standard",
          purchasePrice: 3200,
          sellingPrice: 4999,
          stockQty: 10,
          seriesStart: 298000001001,
        },
      ],
    },
    {
      name: "Micawas Honest Battery WiFi Doorbell Sensor",
      slug: "micawas-honest-battery-wifi-doorbell-sensor",
      description: "We publish measured runtimes from our own lab — not the numbers on the supplier box. Honest 180-day battery runtime.",
      brand: "Micawas",
      vendor: "Micawas Labs",
      hsn: "85311090",
      mrp: 2999,
      offerPrice: 1999,
      gstPercent: 18,
      status: "ACTIVE",
      productType: "PRODUCT",
      showOnWebsite: true,
      featured: true,
      tags: "doorbell,sensor,battery,wifi",
      imageUrl: "https://res.cloudinary.com/drxzuvrbq/image/upload/v1790650000/barcode-inventory/micawas_doorbell.png",
      variants: [
        {
          sku: "MICA-SEN-DOOR-WHT",
          color: "Pearl White",
          size: "2 Pack",
          purchasePrice: 1100,
          sellingPrice: 1999,
          stockQty: 12,
          seriesStart: 298000002001,
        },
      ],
    },
    {
      name: "Micawas Solar Power Bank 10W for Outdoor Cameras",
      slug: "micawas-solar-power-bank-10w-outdoor-cameras",
      description: "Continuous power supply for all outdoor WiFi security gadgets. Weatherproof IP67 rated.",
      brand: "Micawas",
      vendor: "Micawas Labs",
      hsn: "85414011",
      mrp: 3499,
      offerPrice: 2499,
      gstPercent: 18,
      status: "ACTIVE",
      productType: "PRODUCT",
      showOnWebsite: true,
      featured: false,
      tags: "solar,power,battery,outdoor",
      imageUrl: "https://res.cloudinary.com/drxzuvrbq/image/upload/v1790650000/barcode-inventory/micawas_solar.png",
      variants: [
        {
          sku: "MICA-SOL-10W-GRY",
          color: "Graphite Grey",
          size: "10W",
          purchasePrice: 1400,
          sellingPrice: 2499,
          stockQty: 8,
          seriesStart: 298000003001,
        },
      ],
    },
  ];

  for (const p of sampleProducts) {
    let product = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (!product) {
      product = await prisma.product.create({
        data: {
          name: p.name,
          slug: p.slug,
          description: p.description,
          categoryId: category.id,
          subCategoryId: subCategory.id,
          brand: p.brand,
          vendor: p.vendor,
          hsn: p.hsn,
          mrp: p.mrp,
          offerPrice: p.offerPrice,
          gstPercent: p.gstPercent,
          status: p.status,
          productType: p.productType,
          showOnWebsite: p.showOnWebsite,
          featured: p.featured,
          tags: p.tags,
          imageUrl: p.imageUrl,
        },
      });
      console.log(`Created product: ${product.name}`);
    }

    for (const v of p.variants) {
      let variant = await prisma.productVariant.findUnique({ where: { sku: v.sku } });
      if (!variant) {
        variant = await prisma.productVariant.create({
          data: {
            productId: product.id,
            sku: v.sku,
            color: v.color,
            size: v.size,
            purchasePrice: v.purchasePrice,
            sellingPrice: v.sellingPrice,
            status: "ACTIVE",
          },
        });
        console.log(`  Created variant SKU: ${variant.sku}`);

        // Create Inventory record
        await prisma.inventory.create({
          data: {
            productVariantId: variant.id,
            warehouse: "MAIN",
            quantity: v.stockQty,
          },
        });

        // Generate per-unit barcodes for stockQty
        for (let i = 0; i < v.stockQty; i++) {
          const barcodeStr = (v.seriesStart + i).toString();
          await prisma.unitBarcode.create({
            data: {
              productVariantId: variant.id,
              barcode: barcodeStr,
              serialNumber: i + 1,
              status: "AVAILABLE",
              generatedBy: "system_seed",
            },
          });
        }
        console.log(`    Generated ${v.stockQty} unit barcodes for ${variant.sku}`);
      }
    }
  }

  console.log("Seeding finished successfully!");
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
