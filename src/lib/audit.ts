import { prisma } from "./prisma";
import { ZAA_COOKIE, decodeAndValidateSessionToken } from "./authSession";

export interface AuditParams {
  action: string;
  entity?: "PRODUCT" | "VARIANT" | "BARCODE" | "ORDER" | "INVENTORY" | "USER" | string;
  entityId?: string;
  sku?: string;
  productName?: string;
  details?: string;
  performedBy?: string;
}

/**
 * Resolves current actor name or email from Next.js request cookies / headers / fallback
 */
export function resolveActor(req?: Request | any, fallback = "Admin"): string {
  try {
    if (!req) return fallback;

    // 1. From NextRequest cookies
    if (req.cookies && typeof req.cookies.get === "function") {
      const cookie = req.cookies.get(ZAA_COOKIE);
      if (cookie?.value) {
        const session = decodeAndValidateSessionToken(cookie.value);
        if (session?.email) return session.email;
      }
    }

    // 2. From cookie header in raw Request
    if (req.headers && typeof req.headers.get === "function") {
      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(new RegExp(`${ZAA_COOKIE}=([^;]+)`));
      if (match && match[1]) {
        const session = decodeAndValidateSessionToken(match[1]);
        if (session?.email) return session.email;
      }

      // Check custom headers if provided
      const xUser = req.headers.get("x-user") || req.headers.get("x-performed-by");
      if (xUser) return xUser;
    }
  } catch (err) {
    console.error("Error resolving actor in audit:", err);
  }
  return fallback;
}

/**
 * Writes an entry to the AuditLog collection and updates the target SKU's lastActedBy metadata
 */
export async function writeAudit(params: AuditParams) {
  try {
    const actor = params.performedBy || "Admin";

    // 1. Create central audit log
    const log = await prisma.auditLog.create({
      data: {
        action: params.action,
        entity: params.entity || "SYSTEM",
        entityId: params.entityId,
        sku: params.sku,
        productName: params.productName,
        details: params.details,
        performedBy: actor,
      },
    });

    // 2. If a specific SKU or variantId is involved, update the variant's lastActedBy fields
    if (params.sku || (params.entity === "VARIANT" && params.entityId)) {
      try {
        await prisma.productVariant.updateMany({
          where: params.sku ? { sku: params.sku } : { id: params.entityId },
          data: {
            lastActedBy: actor,
            lastActedAt: new Date(),
            lastAction: params.action,
          },
        });
      } catch (err) {
        // Non-blocking if variant doesn't match
      }
    }

    return log;
  } catch (error) {
    console.error("writeAudit error:", error);
    return null;
  }
}
