import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { HeroBanner, DEFAULT_HERO_BANNER } from "./heroBannerTypes";

export { type HeroBanner, DEFAULT_HERO_BANNER };

const HERO_FILE_PATH = path.join(process.cwd(), "hero_banners.json");

export async function getHeroBanners(): Promise<HeroBanner[]> {
  // 1. Try reading from MongoDB raw collection
  try {
    const rawResult = (await prisma.$runCommandRaw({
      find: "HeroBanner",
      sort: { displayOrder: 1 },
    })) as any;

    const docs = rawResult?.cursor?.firstBatch;
    if (Array.isArray(docs) && docs.length > 0) {
      return docs.map((doc: any) => ({
        ...DEFAULT_HERO_BANNER,
        ...doc,
        _id: doc._id?.toString() || doc._id || doc.id || DEFAULT_HERO_BANNER._id,
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt || DEFAULT_HERO_BANNER.createdAt,
        updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt || DEFAULT_HERO_BANNER.updatedAt,
      }));
    }
  } catch (dbErr) {
    // Fallback to local JSON file
  }

  // 2. Try reading from local JSON file
  try {
    if (fs.existsSync(HERO_FILE_PATH)) {
      const fileData = fs.readFileSync(HERO_FILE_PATH, "utf-8");
      const parsed = JSON.parse(fileData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (fsErr) {
    // Return default on error
  }

  return [DEFAULT_HERO_BANNER];
}

export async function saveHeroBanner(bannerData: Partial<HeroBanner>): Promise<HeroBanner> {
  const existingList = await getHeroBanners();
  const bannerId = bannerData._id || DEFAULT_HERO_BANNER._id;

  const nowIso = new Date().toISOString();
  const existingIndex = existingList.findIndex((b) => b._id === bannerId);

  let updatedBanner: HeroBanner;
  if (existingIndex >= 0) {
    updatedBanner = {
      ...existingList[existingIndex],
      ...bannerData,
      _id: bannerId,
      updatedAt: nowIso,
    };
    existingList[existingIndex] = updatedBanner;
  } else {
    updatedBanner = {
      ...DEFAULT_HERO_BANNER,
      ...bannerData,
      _id: bannerId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    existingList.push(updatedBanner);
  }

  // 1. Persist to MongoDB raw collection
  try {
    await prisma.$runCommandRaw({
      update: "HeroBanner",
      updates: [
        {
          q: { _id: bannerId },
          u: {
            $set: {
              ...updatedBanner,
              _id: bannerId,
              updatedAt: new Date(),
            },
          },
          upsert: true,
        },
      ],
    } as any);
  } catch (dbErr) {
    console.warn("Could not persist HeroBanner to MongoDB raw collection:", dbErr);
  }

  // 2. Persist to local JSON file
  try {
    fs.writeFileSync(HERO_FILE_PATH, JSON.stringify(existingList, null, 2), "utf-8");
  } catch (fsErr) {
    console.error("Failed to write hero_banners.json:", fsErr);
  }

  return updatedBanner;
}
