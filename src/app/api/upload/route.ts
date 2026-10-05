import { NextResponse } from "next/server";
import { uploadToCloudinary } from "@/lib/cloudinary";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | string | null;

    if (!file) {
      return NextResponse.json({ error: "No image file provided in request" }, { status: 400 });
    }

    const url = await uploadToCloudinary(file);
    return NextResponse.json({ url, success: true });
  } catch (error: any) {
    console.error("POST /api/upload error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
