export const ZAA_ADMIN_USER = "admin@gmail.com";
export const ZAA_ADMIN_PASS = "Admin@123";
export const ZAA_ADMIN_ALT_USER = "admin";
export const ZAA_ADMIN_ALT_PASS = "admin123";
export const ZAA_COOKIE = "zaa_admin";
export const ZAA_COOKIE_VALUE = "ok";

export * from "./authSession";

export function zaaPrice(offerPrice: number, gstPercent: number, mrp: number) {
  const discount = Math.max(0, mrp - offerPrice);
  const gstAmount = (offerPrice * gstPercent) / 100;
  const finalPrice = offerPrice + gstAmount;
  return { discount, gstAmount, finalPrice };
}

export function slugify(name: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "item";
}

export const ZAA_STAGES = [
  {
    n: 1,
    title: "Catalog shell",
    detail: "Public home, product list, product page, admin products.",
    done: true,
  },
  {
    n: 2,
    title: "Categories and services",
    detail: "3-level menu, service pages, enquiry form.",
    done: false,
  },
  {
    n: 3,
    title: "Cart and orders",
    detail: "Customer login, cart, checkout, order status.",
    done: false,
  },
  {
    n: 4,
    title: "Quotations and invoices",
    detail: "Enquiries, quotations, PDF invoice.",
    done: false,
  },
  {
    n: 5,
    title: "Warehouse",
    detail: "Suppliers, purchase orders, GRN, outward, waste.",
    done: false,
  },
  {
    n: 6,
    title: "Connect barcodes",
    detail: "Attach the barcode app to Adminzaa products. Still a separate view until then.",
    done: false,
  },
] as const;
