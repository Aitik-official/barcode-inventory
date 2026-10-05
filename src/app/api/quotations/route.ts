import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const quotations = await prisma.quotation.findMany({
      include: { customer: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(quotations);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { customerId, totalAmount = 0, notes, enquiryId } = body;

    const count = await prisma.quotation.count();
    const quotationNumber = `QUO-${String(count + 1).padStart(4, "0")}`;

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        customerId: customerId || null,
        totalAmount: Number(totalAmount) || 0,
        status: "SENT",
        notes: notes?.trim() || null,
      },
      include: { customer: true },
    });

    if (enquiryId) {
      await prisma.enquiry.update({
        where: { id: enquiryId },
        data: { status: "responded", adminNotes: `Quotation issued: ${quotationNumber}` },
      });
    }

    return NextResponse.json(quotation, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
