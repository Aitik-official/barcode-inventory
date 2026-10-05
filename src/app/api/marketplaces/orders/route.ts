import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const channel = searchParams.get("channel");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: any = {};
    if (channel && channel !== "ALL") {
      where.channel = channel;
    }
    if (status && status !== "ALL") {
      where.orderStatus = status;
    }
    if (search) {
      where.OR = [
        { channelOrderId: { contains: search, mode: "insensitive" } },
        { buyerName: { contains: search, mode: "insensitive" } },
        { buyerCity: { contains: search, mode: "insensitive" } },
        { trackingNumber: { contains: search, mode: "insensitive" } },
        { items: { some: { title: { contains: search, mode: "insensitive" } } } },
        { items: { some: { channelSku: { contains: search, mode: "insensitive" } } } },
      ];
    }

    const orders = await prisma.marketplaceOrder.findMany({
      where,
      orderBy: { orderDate: "desc" },
      include: {
        credential: { select: { name: true, channel: true } },
        items: true,
      },
    });

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    console.error("Error fetching marketplace orders:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
