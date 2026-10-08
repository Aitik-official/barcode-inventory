import { NextResponse } from "next/server";
import { getHeroBanners, saveHeroBanner } from "@/lib/heroBanner";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const showAll = searchParams.get("all") === "true";

    const banners = await getHeroBanners();
    const filtered = showAll ? banners : banners.filter((b) => b.status === "ACTIVE");

    // Return the primary active banner if single requested or list
    if (searchParams.get("single") === "true") {
      return NextResponse.json(filtered[0] || banners[0]);
    }

    return NextResponse.json(filtered);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const saved = await saveHeroBanner(body);
    return NextResponse.json(saved, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const saved = await saveHeroBanner(body);
    return NextResponse.json(saved, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
