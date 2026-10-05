"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Stats = {
  totalProducts: number;
  barcodedProducts: number;
  missingBarcode: number;
  activeBarcodes: number;
  retiredBarcodes: number;
  labelsPrinted: number;
  totalStock: number;
};

const STEPS = [
  {
    n: "1",
    title: "Add a product",
    text: "Enter name, size/color, price, and stock. Barcode is created automatically.",
    href: "/products/new",
    cta: "Add product",
  },
  {
    n: "2",
    title: "Print labels",
    text: "Open the product → Print label → pick size (50×30 mm etc.) → print.",
    href: "/products",
    cta: "Open products",
  },
  {
    n: "3",
    title: "Stick labels",
    text: "Put printed labels on the physical items so you can scan them later.",
    href: "/guide",
    cta: "See guide",
  },
  {
    n: "4",
    title: "Scan & sell",
    text: "On Sell page, scan barcode (or type it). Same scan increases qty. Complete sale.",
    href: "/scan",
    cta: "Go to Sell",
  },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  const cards = stats
    ? [
        {
          label: "Products",
          value: stats.totalProducts,
          tip: "Sellable variants",
          tone: "normal" as const,
        },
        {
          label: "With barcode",
          value: stats.barcodedProducts,
          tip: "Ready to print / scan",
          tone: "good" as const,
        },
        {
          label: "Missing barcode",
          value: stats.missingBarcode,
          tip: "Needs generate",
          tone: stats.missingBarcode > 0 ? ("warn" as const) : ("normal" as const),
        },
        {
          label: "Stock units",
          value: stats.totalStock,
          tip: "In warehouse",
          tone: "normal" as const,
        },
        {
          label: "Labels printed",
          value: stats.labelsPrinted,
          tip: "All-time copies",
          tone: "normal" as const,
        },
        {
          label: "Retired barcodes",
          value: stats.retiredBarcodes,
          tip: "Replaced / old",
          tone: "normal" as const,
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl border border-teal-200/60 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-teal-800 via-teal-700 to-cyan-800 px-6 py-7 text-white sm:px-8">
          <p className="text-sm font-medium text-teal-100">Welcome</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Create products → print barcodes → scan to sell
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-teal-50/90 sm:text-base">
            Simple inventory with Code 128 barcodes. Follow the 4 steps below —
            start to finish in a few minutes.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/products/new"
              className="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-teal-900 shadow-sm hover:bg-teal-50"
            >
              Start: Add product
            </Link>
            <Link
              href="/guide"
              className="rounded-lg border border-white/40 bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/20"
            >
              Full how-to steps
            </Link>
            <Link
              href="/scan"
              className="rounded-lg border border-white/40 bg-white/10 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/20"
            >
              Try demo scan: 2900010245
            </Link>
          </div>
        </div>

        {/* Steps */}
        <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              className={`border-t border-slate-100 p-5 ${
                i > 0 ? "sm:border-l" : ""
              }`}
            >
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-800">
                {s.n}
              </div>
              <h2 className="font-semibold text-slate-900">{s.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.text}</p>
              <Link
                href={s.href}
                className="mt-3 inline-block text-sm font-semibold text-teal-700 hover:text-teal-900 hover:underline"
              >
                {s.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section>
        <div className="mb-3 flex items-end justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">At a glance</h2>
          <Link href="/products" className="text-sm text-teal-700 hover:underline">
            View all products
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stats
            ? cards.map((c) => (
                <div
                  key={c.label}
                  className={`rounded-xl border bg-white p-4 shadow-sm ${
                    c.tone === "warn"
                      ? "border-amber-300"
                      : c.tone === "good"
                        ? "border-teal-200"
                        : "border-slate-200"
                  }`}
                >
                  <p className="text-sm text-slate-500">{c.label}</p>
                  <p
                    className={`mt-1 text-2xl font-bold tabular-nums ${
                      c.tone === "warn" ? "text-amber-700" : "text-slate-900"
                    }`}
                  >
                    {c.value.toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">{c.tip}</p>
                  {c.tone === "warn" && c.value > 0 && (
                    <Link
                      href="/missing"
                      className="mt-2 inline-block text-xs font-semibold text-amber-800 hover:underline"
                    >
                      Fix missing barcodes →
                    </Link>
                  )}
                </div>
              ))
            : Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-100"
                />
              ))}
        </div>
      </section>

      {/* Quick actions */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold">Quick actions</h2>
        <p className="mb-4 text-sm text-slate-500">
          Common tasks — click what you need right now.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Action
            href="/products/new"
            title="Add product"
            desc="New item + barcode"
            primary
          />
          <Action
            href="/products"
            title="Print labels"
            desc="Open product → Print"
          />
          <Action href="/scan" title="Sell / scan" desc="Billing with scanner" />
          <Action
            href="/missing"
            title="Missing barcodes"
            desc="Generate in bulk"
          />
        </div>
      </section>

      {/* Tip box */}
      <aside className="rounded-xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-950">
        <strong className="font-semibold">Demo tip:</strong> A sample product is
        already loaded — <span className="font-mono">Black T-Shirt M</span> with
        barcode{" "}
        <span className="rounded bg-white px-1.5 py-0.5 font-mono font-semibold">
          2900010245
        </span>
        . Go to <Link href="/scan" className="font-semibold underline">Sell</Link>{" "}
        and type/scan that code to try the cart.
      </aside>
    </div>
  );
}

function Action({
  href,
  title,
  desc,
  primary,
}: {
  href: string;
  title: string;
  desc: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${
        primary
          ? "border-teal-600 bg-teal-700 text-white"
          : "border-slate-200 bg-slate-50 text-slate-900 hover:border-teal-300 hover:bg-white"
      }`}
    >
      <span className="block font-semibold">{title}</span>
      <span
        className={`mt-0.5 block text-sm ${
          primary ? "text-teal-100" : "text-slate-500"
        }`}
      >
        {desc}
      </span>
    </Link>
  );
}
