import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const pos = await prisma.purchaseOrder.findMany({
      include: { supplier: true, items: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(pos);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { supplierId, totalAmount = 0, notes, items } = body;

    if (!supplierId) {
      return NextResponse.json({ error: "Supplier is required" }, { status: 400 });
    }

    const count = await prisma.purchaseOrder.count();
    const poNumber = `PO-${String(count + 1).padStart(4, "0")}`;

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId,
        totalAmount: Number(totalAmount) || 0,
        status: "PO_CREATED",
        notes: notes?.trim() || null,
        items: {
          create: Array.isArray(items)
            ? items.map((i: any) => ({
                sku: i.sku || "PROD-1",
                name: i.name || "Stock Item",
                quantity: Number(i.quantity) || 1,
                unitPrice: Number(i.unitPrice) || 0,
                totalPrice: (Number(i.quantity) || 1) * (Number(i.unitPrice) || 0),
              }))
            : [],
        },
      },
      include: { supplier: true, items: true },
    });

    return NextResponse.json(po, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
