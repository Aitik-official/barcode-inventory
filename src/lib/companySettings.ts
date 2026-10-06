import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { CompanySettingsData, DEFAULT_COMPANY_SETTINGS } from "./companySettingsTypes";

export { type CompanySettingsData, DEFAULT_COMPANY_SETTINGS };

const SETTINGS_FILE_PATH = path.join(process.cwd(), "company_settings.json");

export async function getCompanySettings(): Promise<CompanySettingsData> {
  // 1. Try fetching from MongoDB database raw collection
  try {
    const rawResult = (await prisma.$runCommandRaw({
      find: "CompanySettings",
      limit: 1,
    })) as any;

    const firstDoc = rawResult?.cursor?.firstBatch?.[0];
    if (firstDoc) {
      return {
        ...DEFAULT_COMPANY_SETTINGS,
        ...firstDoc,
        id: firstDoc._id?.toString() || firstDoc.id,
      };
    }
  } catch (dbErr) {
    // If MongoDB raw collection not initialized or error, proceed to file store
  }

  // 2. Try fetching from local JSON file
  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const fileData = fs.readFileSync(SETTINGS_FILE_PATH, "utf-8");
      const parsed = JSON.parse(fileData);
      return { ...DEFAULT_COMPANY_SETTINGS, ...parsed };
    }
  } catch (fsErr) {
    // Return default on error
  }

  return DEFAULT_COMPANY_SETTINGS;
}

export async function saveCompanySettings(
  data: Partial<CompanySettingsData>
): Promise<CompanySettingsData> {
  const current = await getCompanySettings();
  const merged: CompanySettingsData = {
    ...current,
    ...data,
    updatedAt: new Date().toISOString(),
  };

  // 1. Persist to MongoDB raw collection
  try {
    await prisma.$runCommandRaw({
      update: "CompanySettings",
      updates: [
        {
          q: { _id: { $exists: true } },
          u: { $set: merged },
          upsert: true,
        },
      ],
    });
  } catch (dbErr) {
    // Continue saving to file
  }

  // 2. Persist to local JSON file for instant reliability
  try {
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(merged, null, 2), "utf-8");
  } catch (fsErr) {
    console.error("Failed to write company_settings.json:", fsErr);
  }

  return merged;
}
