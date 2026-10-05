import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      variants: {
        include: {
          inventory: true,
          unitBarcodes: { orderBy: { serialNumber: "asc" } },
          transactions: { orderBy: { createdAt: "desc" }, take: 20 },
        },
      },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json(product);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    // Support toggle showOnWebsite, status, etc.
    const updated = await prisma.product.update({
      where: { id },
      data: body,
      include: {
        category: true,
        subCategory: true,
        level2Category: true,
        variants: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PATCH /api/products/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        imageUrl: body.imageUrl,
        categoryId: body.categoryId || null,
        subCategoryId: body.subCategoryId || null,
        level2CategoryId: body.level2CategoryId || null,
        mrp: Number(body.mrp) || 0,
        offerPrice: Number(body.offerPrice) || 0,
        gstPercent: Number(body.gstPercent) || 0,
        status: body.status,
        productType: body.productType,
        showOnWebsite: body.showOnWebsite !== undefined ? Boolean(body.showOnWebsite) : undefined,
        featured: body.featured !== undefined ? Boolean(body.featured) : undefined,
        badge: body.badge || null,
        homepageSections: Array.isArray(body.homepageSections) ? body.homepageSections : undefined,
        displayOrder: body.displayOrder !== undefined ? Number(body.displayOrder) : undefined,
      },
      include: {
        category: true,
        variants: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT /api/products/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    
    // Delete product and cascade related records
    const product = await prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const variantIds = product.variants.map((v) => v.id);

    // Clean up dependent unit barcodes, inventory, transactions
    if (variantIds.length > 0) {
      await prisma.inventoryTransaction.deleteMany({
        where: { productVariantId: { in: variantIds } },
      });
      await prisma.unitBarcode.deleteMany({
        where: { productVariantId: { in: variantIds } },
      });
      await prisma.inventory.deleteMany({
        where: { productVariantId: { in: variantIds } },
      });
      await prisma.printJob.deleteMany({
        where: { productVariantId: { in: variantIds } },
      });
      await prisma.productVariant.deleteMany({
        where: { id: { in: variantIds } },
      });
    }

    await prisma.product.delete({ where: { id } });

    return NextResponse.json({ success: true, message: `Product '${product.name}' deleted successfully.` });
  } catch (error: any) {
    console.error("DELETE /api/products/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

