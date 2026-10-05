"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Zap, ArrowRight, CheckCircle2 } from "lucide-react";

type Product = {
  id: string;
  name: string;
  variants: {
    id: string;
    sku: string;
    barcode: string | null;
    color: string | null;
    size: string | null;
  }[];
};

export default function MissingBarcodesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/products");
    const data: Product[] = await res.json();
    setProducts(data);
  }

  useEffect(() => {
    load();
  }, []);

  const missing = products.flatMap((p) =>
    p.variants
      .filter((v) => !v.barcode)
      .map((v) => ({
        productId: p.id,
        productName: p.name,
        ...v,
      }))
  );

  async function generateAll() {
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/barcodes/bulk-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allMissing: true }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMsg(data.error || "Failed");
      return;
    }
    setMsg(`Generated ${data.generated} barcode(s).`);
    await load();
  }

  return (
    <div className="space-y-6 py-2">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#cce7ed] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0b252c] flex items-center gap-2.5">
            <AlertTriangle className="w-6 h-6 text-[#056468]" />
            <span>Missing Barcodes Registry</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Products and SKU variants without an assigned per-unit Code 128 barcode series.
          </p>
        </div>
        <button
          type="button"
          disabled={busy || missing.length === 0}
          onClick={generateAll}
          className="px-4 py-2.5 rounded-xl bg-[#056468] hover:bg-[#044e51] text-white font-medium text-xs shadow-sm disabled:opacity-50 flex items-center gap-2"
        >
          <Zap className="w-4 h-4" />
          {busy ? "Generating…" : "Generate All Missing"}
        </button>
      </div>

      {msg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {msg}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[#cce7ed] bg-white shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#cce7ed] bg-[#f2f9fa] text-[#0b252c] font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3.5">Product Name</th>
              <th className="px-4 py-3.5">SKU Code</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {missing.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                  All variants have barcodes assigned.
                </td>
              </tr>
            ) : (
              missing.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3.5 font-medium text-[#0b252c]">
                    {m.productName}
                    <div className="text-[11px] text-slate-500 font-normal">
                      {[m.color, m.size].filter(Boolean).join(" / ")}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-[#056468] font-medium">{m.sku}</td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/products/${m.productId}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#056468] hover:underline"
                    >
                      <span>Open Product</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

