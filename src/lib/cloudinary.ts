import crypto from "crypto";

/**
 * Server-side signed Cloudinary Upload
 * Uploads files/images to Cloudinary folder "barcode-inventory" using SHA1 API signing.
 */
export async function uploadToCloudinary(
  fileInput: File | Buffer | string,
  filename: string = "image.jpg"
): Promise<string> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const folder = process.env.CLOUDINARY_FOLDER || "barcode-inventory";

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, API_KEY, API_SECRET) are missing.");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  
  // Cloudinary signature format: string to sign must be sorted params + api_secret
  const stringToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(stringToSign).digest("hex");

  const formData = new FormData();

  if (typeof fileInput === "string") {
    formData.append("file", fileInput);
  } else if (fileInput instanceof File) {
    formData.append("file", fileInput, fileInput.name || filename);
  } else {
    const blob = new Blob([new Uint8Array(fileInput)]);
    formData.append("file", blob, filename);
  }

  formData.append("api_key", apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("folder", folder);
  formData.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (data.secure_url) {
    return data.secure_url;
  } else {
    console.error("Cloudinary error response:", data);
    throw new Error(data.error?.message || "Cloudinary image upload failed");
  }
}
