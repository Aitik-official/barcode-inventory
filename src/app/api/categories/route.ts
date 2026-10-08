import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSlug } from "@/lib/barcode";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get("parentId");
    const level = searchParams.get("level");

    const where: any = {};
    if (parentId === "null") {
      where.parentId = null; // Main Categories (Level 1)
    } else if (parentId) {
      where.parentId = parentId; // Sub Categories or Level 2 Sub Categories
    }

    const categories = await prisma.category.findMany({
      where,
      include: {
        parent: true,
        children: {
          include: {
            children: true,
          },
        },
        _count: { select: { products: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(categories);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, parentId = null, mainUse = "product", description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const baseSlug = buildSlug(name);
    let slug = baseSlug;
    let n = 1;
    while (await prisma.category.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${n}`;
      n++;
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        slug,
        parentId: parentId || null,
        mainUse,
        description: description?.trim() || null,
      },
      include: {
        parent: true,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Category ID is required" }, { status: 400 });
    }

    const category = await prisma.category.findUnique({
      where: { id },
      include: { children: true },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // 1. Unlink products referencing this category, sub-category, or level2
    await prisma.product.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });
    await prisma.product.updateMany({
      where: { subCategoryId: id },
      data: { subCategoryId: null },
    });
    await prisma.product.updateMany({
      where: { level2CategoryId: id },
      data: { level2CategoryId: null },
    });

    // 2. Unlink or promote child categories
    if (category.children.length > 0) {
      await prisma.category.updateMany({
        where: { parentId: id },
        data: { parentId: category.parentId || null },
      });
    }

    // 3. Delete category
    await prisma.category.delete({ where: { id } });

    return NextResponse.json({ success: true, message: `Category '${category.name}' deleted successfully.` });
  } catch (error: any) {
    console.error("DELETE /api/categories error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

