const COPY: Record<string, { stage: number; title: string; text: string }> = {
  categories: {
    stage: 2,
    title: "Categories",
    text: "Stage 2 adds create, edit, and the 3-level menu (category, sub-category, level 2). Seed categories already exist for products.",
  },
  customers: {
    stage: 3,
    title: "Customers",
    text: "Stage 3 adds customer accounts. Stock with customer, block/unblock, and suppliers come with the warehouse stage.",
  },
  inventory: {
    stage: 5,
    title: "Warehouse",
    text: "Stage 5 adds purchase orders, inward, GRN, warehouse stock, outward, and waste. Barcode scanning connects in stage 6.",
  },
  orders: {
    stage: 3,
    title: "Orders",
    text: "Stage 3 adds cart and checkout. Quotations and invoices are stage 4.",
  },
  reports: {
    stage: 4,
    title: "Reports",
    text: "Invoice and supplier Excel reports come after orders and warehouse data exist.",
  },
};

export default async function LaterStagePage({
  params,
}: {
  params: Promise<{ area: string }>;
}) {
  const { area } = await params;
  const info = COPY[area] ?? {
    stage: 2,
    title: "Later stage",
    text: "This section is not in stage 1.",
  };

  return (
    <div className="max-w-xl rounded-2xl border border-dashed border-indigo-300 bg-white p-6">
      <p className="text-sm font-semibold text-indigo-700">Stage {info.stage}</p>
      <h1 className="mt-1 text-2xl font-bold">{info.title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{info.text}</p>
    </div>
  );
}
