import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const invoices = await prisma.invoice.findMany({
      include: { order: true, customer: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(invoices);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, customerId, subtotal = 0, gstRate = 18, extraCharges = 0 } = body;

    const count = await prisma.invoice.count();
    const invoiceNumber = `INV-${String(count + 1).padStart(4, "0")}`;

    const sub = Number(subtotal) || 0;
    const gst = Number(gstRate) || 18;
    const extra = Number(extraCharges) || 0;
    const gstAmt = (sub * gst) / 100;
    const cgst = gstAmt / 2;
    const sgst = gstAmt / 2;
    const grandTotal = sub + gstAmt + extra;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        orderId: orderId || null,
        customerId: customerId || null,
        subtotal: sub,
        gstRate: gst,
        cgst,
        sgst,
        extraCharges: extra,
        grandTotal,
      },
      include: { order: true, customer: true },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
