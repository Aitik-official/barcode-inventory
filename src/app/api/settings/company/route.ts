import { NextResponse } from "next/server";
import { getCompanySettings, saveCompanySettings } from "@/lib/companySettings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getCompanySettings();
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    console.error("GET /api/settings/company error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch company settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const updated = await saveCompanySettings(body);
    return NextResponse.json({
      success: true,
      message: "Company and invoice settings updated successfully!",
      settings: updated,
    });
  } catch (error: any) {
    console.error("POST /api/settings/company error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save company settings" },
      { status: 500 }
    );
  }
}
