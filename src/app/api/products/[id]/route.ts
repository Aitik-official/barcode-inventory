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

    // 1. Update Product
    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name : undefined,
        brand: body.brand !== undefined ? body.brand : undefined,
        vendor: body.vendor !== undefined ? body.vendor : undefined,
        hsn: body.hsn !== undefined ? body.hsn : undefined,
        tags: body.tags !== undefined ? body.tags : undefined,
        description: body.description !== undefined ? body.description : undefined,
        imageUrl: body.imageUrl !== undefined ? body.imageUrl : undefined,
        categoryId: body.categoryId !== undefined ? (body.categoryId || null) : undefined,
        subCategoryId: body.subCategoryId !== undefined ? (body.subCategoryId || null) : undefined,
        level2CategoryId: body.level2CategoryId !== undefined ? (body.level2CategoryId || null) : undefined,
        mrp: body.mrp !== undefined ? Number(body.mrp) || 0 : undefined,
        offerPrice: body.offerPrice !== undefined ? Number(body.offerPrice) || 0 : undefined,
        gstPercent: body.gstPercent !== undefined ? Number(body.gstPercent) || 0 : undefined,
        status: body.status !== undefined ? body.status : undefined,
        productType: body.productType !== undefined ? body.productType : undefined,
        showOnWebsite: body.showOnWebsite !== undefined ? Boolean(body.showOnWebsite) : undefined,
        featured: body.featured !== undefined ? Boolean(body.featured) : undefined,
        badge: body.badge !== undefined ? (body.badge || null) : undefined,
        homepageSections: Array.isArray(body.homepageSections) ? body.homepageSections : undefined,
        displayOrder: body.displayOrder !== undefined ? Number(body.displayOrder) : undefined,
      },
    });

    // 2. Update Primary Variant if SKU or prices/attributes provided
    const existingVariant = await prisma.productVariant.findFirst({
      where: { productId: id },
    });

    if (existingVariant) {
      const variantData: any = {};
      if (body.sku && body.sku.trim() !== existingVariant.sku) {
        // Ensure SKU is unique
        const existingSku = await prisma.productVariant.findUnique({
          where: { sku: body.sku.trim() },
        });
        if (existingSku && existingSku.id !== existingVariant.id) {
          return NextResponse.json(
            { error: `SKU '${body.sku.trim()}' is already used by another product.` },
            { status: 400 }
          );
        }
        variantData.sku = body.sku.trim();
      }
      if (body.sellingPrice !== undefined) variantData.sellingPrice = Number(body.sellingPrice) || 0;
      else if (body.offerPrice !== undefined) variantData.sellingPrice = Number(body.offerPrice) || 0;

      if (body.purchasePrice !== undefined) variantData.purchasePrice = Number(body.purchasePrice) || 0;
      if (body.unit !== undefined) variantData.unit = body.unit || "PCS";
      if (body.color !== undefined) variantData.color = body.color || null;
      if (body.size !== undefined) variantData.size = body.size || null;
      if (body.status !== undefined) variantData.status = body.status;

      if (Object.keys(variantData).length > 0) {
        await prisma.productVariant.update({
          where: { id: existingVariant.id },
          data: variantData,
        });
      }
    }

    // 3. Return refreshed complete product
    const refreshed = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        subCategory: true,
        level2Category: true,
        variants: {
          include: {
            inventory: true,
            unitBarcodes: { orderBy: { serialNumber: "asc" } },
            transactions: { orderBy: { createdAt: "desc" }, take: 20 },
          },
        },
      },
    });

    return NextResponse.json(refreshed);
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
      // Find all unit barcodes for these variant IDs
      const unitBarcodes = await prisma.unitBarcode.findMany({
        where: { productVariantId: { in: variantIds } },
        select: { id: true },
      });
      const unitBarcodeIds = unitBarcodes.map((u) => u.id);

      // 1. Unlink OrderItems to avoid foreign key / relation constraint violations
      if (unitBarcodeIds.length > 0) {
        await prisma.orderItem.updateMany({
          where: { unitBarcodeId: { in: unitBarcodeIds } },
          data: { unitBarcodeId: null },
        });
      }
      await prisma.orderItem.updateMany({
        where: { productVariantId: { in: variantIds } },
        data: { productVariantId: null },
      });

      // 2. Unlink MarketplaceOrderItems if any
      await prisma.marketplaceOrderItem.updateMany({
        where: { localVariantId: { in: variantIds } },
        data: { localVariantId: null },
      }).catch(() => {});

      // 3. Delete inventory transactions for these variants or unit barcodes
      await prisma.inventoryTransaction.deleteMany({
        where: {
          OR: [
            { productVariantId: { in: variantIds } },
            ...(unitBarcodeIds.length > 0 ? [{ unitBarcodeId: { in: unitBarcodeIds } }] : []),
          ],
        },
      });

      // 4. Delete auxiliary records
      await prisma.customerStock.deleteMany({
        where: { productVariantId: { in: variantIds } },
      }).catch(() => {});

      await prisma.waste.deleteMany({
        where: { productVariantId: { in: variantIds } },
      }).catch(() => {});

      await prisma.printJob.deleteMany({
        where: { productVariantId: { in: variantIds } },
      }).catch(() => {});

      // 5. Delete unit barcodes
      await prisma.unitBarcode.deleteMany({
        where: { productVariantId: { in: variantIds } },
      });

      // 6. Delete inventory records
      await prisma.inventory.deleteMany({
        where: { productVariantId: { in: variantIds } },
      });

      // 7. Delete product variants
      await prisma.productVariant.deleteMany({
        where: { id: { in: variantIds } },
      });
    }

    // 8. Delete product
    await prisma.product.delete({ where: { id } });

    return NextResponse.json({ success: true, message: `Product '${product.name}' deleted successfully.` });
  } catch (error: any) {
    console.error("DELETE /api/products/[id] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

