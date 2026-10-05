/** Default thermal label sizes (mm) — pick what matches the labels loaded in the printer */
export type LabelSize = {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
  description: string;
};

export const LABEL_SIZES: LabelSize[] = [
  {
    id: "50x50",
    label: "50 × 50 mm (1-Up Chromo)",
    widthMm: 50,
    heightMm: 50,
    description: "50mm × 50mm Square Chromo Label Roll (1000 pcs roll)",
  },
  {
    id: "100x150",
    label: "100 × 150 mm (4×6\" Shipping Invoice)",
    widthMm: 100,
    heightMm: 150,
    description: "Amazon / Flipkart Shipping & Parcel Tax Invoice (400 pcs roll)",
  },
  {
    id: "50x30",
    label: "50 × 30 mm",
    widthMm: 50,
    heightMm: 30,
    description: "Standard retail sticker",
  },
  {
    id: "50x25",
    label: "50 × 25 mm",
    widthMm: 50,
    heightMm: 25,
    description: "Small product tag — common for apparel",
  },
  {
    id: "75x50",
    label: "75 × 50 mm",
    widthMm: 75,
    heightMm: 50,
    description: "Warehouse / shelf label",
  },
  {
    id: "100x50",
    label: "100 × 50 mm",
    widthMm: 100,
    heightMm: 50,
    description: "Large box / carton label",
  },
];

export const DEFAULT_LABEL_SIZE_ID = "50x50";

export function getLabelSize(id: string): LabelSize {
  return LABEL_SIZES.find((s) => s.id === id) ?? LABEL_SIZES[0];
}
