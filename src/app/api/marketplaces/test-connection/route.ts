import { NextResponse } from "next/server";
import { getAmazonLwaToken } from "@/lib/amazonSpApi";
import { getFlipkartToken } from "@/lib/flipkartApi";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, channel, appId, appSecret, refreshToken, sellerId, sandbox } = body;

    let creds = {
      channel,
      appId,
      appSecret,
      refreshToken,
      sellerId,
      sandbox,
    };

    // If existing ID provided, load from DB if secrets are masked
    if (id) {
      const dbCred = await prisma.marketplaceCredential.findUnique({ where: { id } });
      if (dbCred) {
        creds = {
          channel: dbCred.channel,
          appId: appId || dbCred.appId,
          appSecret: (appSecret && !appSecret.includes("••••")) ? appSecret : dbCred.appSecret,
          refreshToken: (refreshToken && !refreshToken.includes("••••")) ? refreshToken : dbCred.refreshToken,
          sellerId: sellerId || dbCred.sellerId,
          sandbox: sandbox !== undefined ? sandbox : dbCred.sandbox,
        };
      }
    }

    if (creds.channel === "AMAZON") {
      const res = await getAmazonLwaToken({
        appId: creds.appId,
        appSecret: creds.appSecret,
        refreshToken: creds.refreshToken,
        sellerId: creds.sellerId,
        sandbox: creds.sandbox,
      });

      return NextResponse.json({
        success: true,
        channel: "AMAZON",
        message: "Successfully authenticated with Login with Amazon (LWA)! SP-API Token granted.",
        tokenExpiresIn: res.expiresIn,
      });
    } else if (creds.channel === "FLIPKART") {
      const res = await getFlipkartToken({
        appId: creds.appId,
        appSecret: creds.appSecret,
        sellerId: creds.sellerId,
        sandbox: creds.sandbox,
      });

      return NextResponse.json({
        success: true,
        channel: "FLIPKART",
        message: "Successfully authenticated with Flipkart Marketplace OAuth! API Scope active.",
        tokenExpiresIn: res.expiresIn,
      });
    } else {
      return NextResponse.json({ success: false, error: "Unsupported channel: " + creds.channel }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Test connection error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to authenticate with marketplace API",
    }, { status: 400 });
  }
}
