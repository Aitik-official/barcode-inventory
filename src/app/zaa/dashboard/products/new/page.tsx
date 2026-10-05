"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Category = { id: string; name: string; mainUse: string };

export default function NewZaaProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/zaa/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/zaa/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(fd.get("name") || ""),
        categoryId: String(fd.get("categoryId") || "") || undefined,
        mrp: Number(fd.get("mrp") || 0),
        offerPrice: Number(fd.get("offerPrice") || 0),
        gstPercent: Number(fd.get("gstPercent") || 0),
        stock: Number(fd.get("stock") || 0),
        description: String(fd.get("description") || "") || undefined,
        hsn: String(fd.get("hsn") || "") || undefined,
        vendor: String(fd.get("vendor") || "") || undefined,
        status: String(fd.get("status") || "ACTIVE"),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Save failed");
      setBusy(false);
      return;
    }
    router.push("/zaa/dashboard/products");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold">Add product</h1>
      <p className="mb-4 mt-1 text-sm text-slate-600">
        Discount is MRP minus offer price. The shop shows offer price plus GST.
      </p>
      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <Field name="name" label="Name" required />
        <label className="block text-sm font-medium">
          Category
          <select name="categoryId" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2">
            <option value="">None</option>
            {categories
              .filter((c) => c.mainUse === "product")
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </label>
        <div className="grid grid-cols-3 gap-2">
          <Field name="mrp" label="MRP ₹" type="number" defaultValue="0" />
          <Field name="offerPrice" label="Offer ₹" type="number" defaultValue="0" />
          <Field name="gstPercent" label="GST %" type="number" defaultValue="18" />
        </div>
        <Field name="stock" label="Stock" type="number" defaultValue="0" />
        <Field name="hsn" label="HSN" />
        <Field name="vendor" label="Vendor" />
        <label className="block text-sm font-medium">
          Description
          <textarea name="description" rows={3} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">
          Status
          <select name="status" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2">
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="OUT_OF_STOCK">Out of stock</option>
          </select>
        </label>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button
          disabled={busy}
          className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save product"}
        </button>
      </form>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        step={type === "number" ? "any" : undefined}
        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
      />
    </label>
  );
}
