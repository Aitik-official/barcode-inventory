import crypto from "crypto";

export type RoleType = "SUPER_ADMIN" | "ADMIN" | "STAFF" | "ACCOUNTANT" | "CUSTOM";

export interface PermissionDefinition {
  id: string;
  name: string;
  category: "Catalog" | "Inventory" | "Barcodes & POS" | "Orders & Billing" | "Marketplaces" | "Partners & Reports" | "Administration";
  description: string;
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // Catalog
  { id: "CATALOG_VIEW", name: "View Products & Categories", category: "Catalog", description: "Browse catalog and product details" },
  { id: "CATALOG_MANAGE", name: "Create & Edit Products", category: "Catalog", description: "Add new products, modify prices and variants" },
  { id: "CATALOG_DELETE", name: "Delete Products", category: "Catalog", description: "Delete products and categories from the system" },

  // Inventory
  { id: "INVENTORY_VIEW", name: "View Stock Levels", category: "Inventory", description: "See available unit counts and transactions" },
  { id: "INVENTORY_RECEIVE", name: "Receive & Refill Stock", category: "Inventory", description: "Receive batches and generate unit barcodes" },
  { id: "INVENTORY_ADJUST", name: "Record Waste & Adjustments", category: "Inventory", description: "Mark damaged, lost, or adjustment units" },

  // Barcodes & POS
  { id: "BARCODE_GENERATE", name: "Generate Unit Barcodes", category: "Barcodes & POS", description: "Create new sequential Code 128 barcodes" },
  { id: "BARCODE_PRINT", name: "Print Labels & Thermal Rolls", category: "Barcodes & POS", description: "Print 50x50mm and thermal labels" },
  { id: "POS_SCAN", name: "POS Quick Scan Checkout", category: "Barcodes & POS", description: "Perform counter scanning and retail checkout" },

  // Orders & Billing
  { id: "ORDERS_VIEW", name: "View Orders & Invoices", category: "Orders & Billing", description: "Browse customer orders and tax invoices" },
  { id: "ORDERS_FULFILL", name: "Dispatch & Barcode Pack", category: "Orders & Billing", description: "Scan unit barcodes to fulfill orders" },
  { id: "INVOICE_GENERATE", name: "Generate Invoices & Quotes", category: "Orders & Billing", description: "Issue tax invoices and B2B quotations" },

  // Marketplaces
  { id: "MARKETPLACE_VIEW", name: "View Amazon & Flipkart Hub", category: "Marketplaces", description: "Browse synced marketplace orders & mappings" },
  { id: "MARKETPLACE_SYNC", name: "Sync Live Orders", category: "Marketplaces", description: "Trigger order synchronization from SP-API / Flipkart" },
  { id: "MARKETPLACE_PUSH_STOCK", name: "Push Stock to Channels", category: "Marketplaces", description: "Push available barcode stock to Amazon & Flipkart" },
  { id: "MARKETPLACE_CREDENTIALS", name: "Manage Channel API Keys", category: "Marketplaces", description: "Update SP-API and Flipkart OAuth credentials" },

  // Partners & Reports
  { id: "PARTNERS_MANAGE", name: "Manage Customers & Suppliers", category: "Partners & Reports", description: "Create and edit customer and vendor records" },
  { id: "REPORTS_VIEW", name: "View Financial & Sales Analytics", category: "Partners & Reports", description: "Access sales reports and stock valuation" },

  // Administration
  { id: "USERS_MANAGE", name: "Manage Team & Roles", category: "Administration", description: "Invite, edit, suspend users and configure RBAC" },
  { id: "SETTINGS_MANAGE", name: "System Settings & Logs", category: "Administration", description: "Access audit logs and core system settings" },
];

export function getDefaultPermissionsForRole(role: RoleType): string[] {
  switch (role) {
    case "SUPER_ADMIN":
      return ALL_PERMISSIONS.map((p) => p.id);

    case "ADMIN":
      return ALL_PERMISSIONS.filter(
        (p) => p.id !== "USERS_MANAGE" && p.id !== "SETTINGS_MANAGE" && p.id !== "CATALOG_DELETE"
      ).map((p) => p.id);

    case "STAFF":
      return [
        "CATALOG_VIEW",
        "INVENTORY_VIEW",
        "INVENTORY_RECEIVE",
        "BARCODE_PRINT",
        "POS_SCAN",
        "ORDERS_VIEW",
        "ORDERS_FULFILL",
        "MARKETPLACE_VIEW",
      ];

    case "ACCOUNTANT":
      return [
        "CATALOG_VIEW",
        "INVENTORY_VIEW",
        "ORDERS_VIEW",
        "INVOICE_GENERATE",
        "PARTNERS_MANAGE",
        "REPORTS_VIEW",
      ];

    case "CUSTOM":
    default:
      return ["CATALOG_VIEW", "INVENTORY_VIEW", "BARCODE_PRINT", "POS_SCAN"];
  }
}

/**
 * Hash password securely with crypto salt (PBKDF2)
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify hashed password
 */
export function verifyPassword(password: string, combined: string): boolean {
  if (!combined || !combined.includes(":")) return false;
  const [salt, originalHash] = combined.split(":");
  const testHash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(originalHash, "hex"), Buffer.from(testHash, "hex"));
}
