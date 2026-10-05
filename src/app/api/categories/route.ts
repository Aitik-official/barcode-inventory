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
