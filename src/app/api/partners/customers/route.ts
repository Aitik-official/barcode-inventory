import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        customerStocks: { include: { productVariant: { include: { product: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(customers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, username, email, phone, company, address, city, state, zip, gstin } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Customer name is required" }, { status: 400 });
    }

    const cleanName = name.trim();
    const cleanUsername = (username || cleanName.toLowerCase().replace(/[^a-z0-9]/g, "") + "_" + Math.floor(100 + Math.random() * 900)).trim().toLowerCase();
    const cleanEmail = (email || `${cleanUsername}@customer.local`).trim().toLowerCase();

    // Check if customer already exists by email or username
    let customer = await prisma.customer.findFirst({
      where: {
        OR: [{ email: cleanEmail }, { username: cleanUsername }],
      },
    });

    if (customer) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: cleanName,
          phone: phone?.trim() || customer.phone,
          company: company?.trim() || customer.company,
          address: address?.trim() || customer.address,
          city: city?.trim() || customer.city,
          state: state?.trim() || customer.state,
          zip: zip?.trim() || customer.zip,
          gstin: gstin?.trim() || customer.gstin,
        },
      });
      return NextResponse.json(customer, { status: 200 });
    }

    customer = await prisma.customer.create({
      data: {
        name: cleanName,
        username: cleanUsername,
        email: cleanEmail,
        phone: phone?.trim() || null,
        company: company?.trim() || null,
        address: address?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        zip: zip?.trim() || null,
        gstin: gstin?.trim() || null,
        status: "ACTIVE",
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
