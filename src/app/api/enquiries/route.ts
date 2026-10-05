import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const enquiries = await prisma.enquiry.findMany({
      include: { customer: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(enquiries);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, company, phone, email, itemName, message, itemType = "service", preferredContact = "email" } = body;

    if (!name || !message || !itemName) {
      return NextResponse.json({ error: "Name, item name, and message are required" }, { status: 400 });
    }

    const enquiry = await prisma.enquiry.create({
      data: {
        name: name.trim(),
        company: company?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        itemName: itemName.trim(),
        message: message.trim(),
        itemType,
        preferredContact,
        status: "pending",
      },
    });

    return NextResponse.json(enquiry, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
