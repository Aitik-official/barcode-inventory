import { prisma } from "./prisma";

const INTERNAL_PREFIX = "29";

/**
 * Generate a unique 12-digit numeric barcode string from global/series counter
 */
export async function generateSingleBarcodeString(): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const seq = Date.now().toString().slice(-8) + String(Math.floor(Math.random() * 100)).padStart(2, "0");
    const barcode = `${INTERNAL_PREFIX}${seq}`.slice(0, 12);

    const existing = await prisma.unitBarcode.findUnique({
      where: { barcode },
    });

    if (!existing) {
      return barcode;
    }
  }
  throw new Error("Could not generate a unique unit barcode. Please try again.");
}

/**
 * Generate N unique serial unit barcodes for a ProductVariant.
 * Each unit item gets its own unique barcode in the series.
 */
export async function generateUnitBarcodesForVariant(params: {
  productVariantId: string;
  quantity: number;
  generatedBy?: string;
  note?: string;
}): Promise<{ barcodes: string[]; count: number }> {
  const { productVariantId, quantity, generatedBy = "system", note } = params;

  if (quantity <= 0) {
    return { barcodes: [], count: 0 };
  }

  // Get current highest serial number for this variant
  const lastUnit = await prisma.unitBarcode.findFirst({
    where: { productVariantId },
    orderBy: { serialNumber: "desc" },
  });

  let nextSerial = (lastUnit?.serialNumber ?? 0) + 1;
  const createdBarcodes: string[] = [];

  for (let i = 0; i < quantity; i++) {
    const barcodeStr = await generateSingleBarcodeString();
    
    await prisma.unitBarcode.create({
      data: {
        productVariantId,
        barcode: barcodeStr,
        serialNumber: nextSerial,
        status: "AVAILABLE",
        generatedBy,
      },
    });

    createdBarcodes.push(barcodeStr);
    nextSerial++;
  }

  // Sync Inventory available quantity
  const availableCount = await prisma.unitBarcode.count({
    where: { productVariantId, status: "AVAILABLE" },
  });

  const currentInv = await prisma.inventory.findUnique({
    where: { productVariantId },
  });

  const prevStock = currentInv?.quantity ?? 0;

  await prisma.inventory.upsert({
    where: { productVariantId },
    create: {
      productVariantId,
      warehouse: "MAIN",
      quantity: availableCount,
    },
    update: {
      quantity: availableCount,
    },
  });

  // Log inventory transaction
  await prisma.inventoryTransaction.create({
    data: {
      productVariantId,
      transactionType: "RECEIVE",
      quantity,
      previousStock: prevStock,
      newStock: availableCount,
      note: note || `Generated ${quantity} per-unit barcodes (series ${createdBarcodes[0]}..${createdBarcodes[createdBarcodes.length - 1]})`,
      performedBy: generatedBy,
    },
  });

  return { barcodes: createdBarcodes, count: quantity };
}

/**
 * Build automatic clean SKU from product name, color, and size
 */
export function buildSku(parts: {
  name: string;
  color?: string | null;
  size?: string | null;
}): string {
  const slug = (s: string) =>
    s
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "")
      .slice(0, 8);

  const base = slug(parts.name) || "PROD";
  const color = parts.color ? slug(parts.color).slice(0, 4) : "";
  const size = parts.size ? slug(parts.size).slice(0, 4) : "";
  const suffix = [color, size].filter(Boolean).join("-");
  return suffix ? `${base}-${suffix}` : base;
}

/**
 * Ensure unique SKU in DB
 */
export async function ensureUniqueSku(base: string): Promise<string> {
  let sku = base;
  let n = 1;
  while (await prisma.productVariant.findUnique({ where: { sku } })) {
    sku = `${base}-${n}`;
    n += 1;
  }
  return sku;
}

/**
 * Build slug for clean URLs
 */
export function buildSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
