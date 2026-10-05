import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSku, buildSlug, ensureUniqueSku, generateUnitBarcodesForVariant } from "@/lib/barcode";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { brand: { contains: search } },
        { vendor: { contains: search } },
        { variants: { some: { sku: { contains: search } } } },
        { variants: { some: { unitBarcodes: { some: { barcode: { contains: search } } } } } },
      ];
    }
    if (categoryId) {
      where.OR = [
        { categoryId },
        { subCategoryId: categoryId },
        { level2CategoryId: categoryId },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        subCategory: true,
        level2Category: true,
        variants: {
          include: {
            inventory: true,
            unitBarcodes: {
              take: 50,
              orderBy: { serialNumber: "asc" },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(products);
  } catch (error: any) {
    console.error("GET /api/products error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      description,
      imageUrl,
      categoryId,
      subCategoryId,
      level2CategoryId,
      brand,
      vendor,
      hsn,
      mrp = 0,
      offerPrice = 0,
      gstPercent = 0,
      showOnWebsite = true,
      featured = false,
      badge = null,
      homepageSections = [],
      displayOrder = 99,
      productType = "PRODUCT",
      sku: customSku,
      color,
      size,
      unit = "PCS",
      purchasePrice = 0,
      sellingPrice = 0,
      initialQuantity = 0,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }

    const baseSlug = buildSlug(name);
    let slug = baseSlug;
    let n = 1;
    while (await prisma.product.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${n}`;
      n++;
    }

    // Use custom SKU if provided, otherwise auto-generate
    const rawSku = customSku && customSku.trim()
      ? customSku.trim().toUpperCase().replace(/\s+/g, "-")
      : buildSku({ name, color, size });
    const sku = await ensureUniqueSku(rawSku);

    // Create Product & Variant
    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        categoryId: categoryId || null,
        subCategoryId: subCategoryId || null,
        level2CategoryId: level2CategoryId || null,
        brand: brand?.trim() || null,
        vendor: vendor?.trim() || null,
        hsn: hsn?.trim() || null,
        mrp: Number(mrp) || 0,
        offerPrice: Number(offerPrice) || Number(sellingPrice) || 0,
        gstPercent: Number(gstPercent) || 0,
        productType: productType === "SERVICE" ? "SERVICE" : "PRODUCT",
        showOnWebsite: Boolean(showOnWebsite),
        featured: Boolean(featured) || (Array.isArray(homepageSections) && homepageSections.includes("FEATURED")),
        badge: badge?.trim() || null,
        homepageSections: Array.isArray(homepageSections) ? homepageSections : [],
        displayOrder: Number(displayOrder) || 99,
        status: "ACTIVE",
        variants: {
          create: {
            sku,
            color: color?.trim() || null,
            size: size?.trim() || null,
            unit: unit || "PCS",
            purchasePrice: Number(purchasePrice) || 0,
            sellingPrice: Number(sellingPrice) || Number(offerPrice) || 0,
          },
        },
      },
      include: {
        variants: true,
      },
    });

    const variant = product.variants[0];

    // Generate unit barcodes for initial quantity!
    const qtyNum = Number(initialQuantity) || 0;
    if (qtyNum > 0) {
      await generateUnitBarcodesForVariant({
        productVariantId: variant.id,
        quantity: qtyNum,
        generatedBy: "admin",
        note: `Initial product stock (${qtyNum} per-unit barcodes created)`,
      });
    }

    // Return complete product with variant and unit barcodes
    const fullProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: {
        category: true,
        subCategory: true,
        level2Category: true,
        variants: {
          include: {
            inventory: true,
            unitBarcodes: true,
          },
        },
      },
    });

    return NextResponse.json(fullProduct, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/products error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
