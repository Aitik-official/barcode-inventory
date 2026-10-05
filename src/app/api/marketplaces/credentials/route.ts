import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const credentials = await prisma.marketplaceCredential.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { mappings: true, orders: true },
        },
      },
    });

    // Mask secret keys for security
    const sanitized = credentials.map((cred) => ({
      ...cred,
      appSecret: cred.appSecret ? "••••••••••••" + cred.appSecret.slice(-4) : null,
      refreshToken: cred.refreshToken ? "••••••••••••" + cred.refreshToken.slice(-4) : null,
    }));

    return NextResponse.json({ success: true, credentials: sanitized });
  } catch (error: any) {
    console.error("Error fetching marketplace credentials:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      channel,
      name,
      sellerId,
      marketplaceId,
      appId,
      appSecret,
      refreshToken,
      sandbox,
      isActive,
      autoSyncStock,
      autoSyncOrders,
    } = body;

    if (!channel || !name) {
      return NextResponse.json({ success: false, error: "Channel and Name are required" }, { status: 400 });
    }

    if (id) {
      // Update existing
      const updateData: any = {
        channel,
        name,
        sellerId: sellerId || null,
        marketplaceId: marketplaceId || (channel === "AMAZON" ? "A21TJRUUN4KGV" : null),
        appId: appId || null,
        sandbox: !!sandbox,
        isActive: isActive !== undefined ? !!isActive : true,
        autoSyncStock: autoSyncStock !== undefined ? !!autoSyncStock : true,
        autoSyncOrders: autoSyncOrders !== undefined ? !!autoSyncOrders : true,
      };

      // Only update secrets if provided
      if (appSecret && !appSecret.includes("••••")) {
        updateData.appSecret = appSecret;
      }
      if (refreshToken && !refreshToken.includes("••••")) {
        updateData.refreshToken = refreshToken;
      }

      const updated = await prisma.marketplaceCredential.update({
        where: { id },
        data: updateData,
      });

      return NextResponse.json({ success: true, credential: updated });
    } else {
      // Create new
      const created = await prisma.marketplaceCredential.create({
        data: {
          channel,
          name,
          sellerId: sellerId || null,
          marketplaceId: marketplaceId || (channel === "AMAZON" ? "A21TJRUUN4KGV" : null),
          appId: appId || null,
          appSecret: appSecret || null,
          refreshToken: refreshToken || null,
          sandbox: !!sandbox,
          isActive: isActive !== undefined ? !!isActive : true,
          autoSyncStock: autoSyncStock !== undefined ? !!autoSyncStock : true,
          autoSyncOrders: autoSyncOrders !== undefined ? !!autoSyncOrders : true,
        },
      });

      return NextResponse.json({ success: true, credential: created });
    }
  } catch (error: any) {
    console.error("Error saving marketplace credential:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing credential ID" }, { status: 400 });
    }

    await prisma.marketplaceCredential.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting marketplace credential:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
