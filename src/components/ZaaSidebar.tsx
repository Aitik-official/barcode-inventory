"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const groups = [
  {
    id: "catalog",
    label: "Catalog",
    links: [
      { href: "/zaa/dashboard/products", label: "Products" },
      { href: "/zaa/dashboard/categories", label: "Categories" },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    links: [{ href: "/zaa/dashboard/customers", label: "Customers" }],
  },
  {
    id: "inventory",
    label: "Inventory",
    links: [{ href: "/zaa/dashboard/inventory", label: "Warehouse" }],
  },
  {
    id: "orders",
    label: "Orders",
    links: [{ href: "/zaa/dashboard/orders", label: "Orders" }],
  },
  {
    id: "reports",
    label: "Reports",
    links: [{ href: "/zaa/dashboard/reports", label: "Reports" }],
  },
];

export function ZaaSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const initial =
    groups.find((g) => g.links.some((l) => pathname.startsWith(l.href)))?.id ?? "catalog";
  const [open, setOpen] = useState(initial);

  async function logout() {
    await fetch("/api/zaa/login", { method: "DELETE" });
    router.push("/zaa/login");
    router.refresh();
  }

  return (
    <aside className="sticky top-11 flex h-[calc(100vh-2.75rem)] w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-4">
        <Link href="/zaa/dashboard" className="block font-bold text-indigo-800">
          Adminzaa
        </Link>
        <p className="text-xs text-slate-500">Operations</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <Link
          href="/zaa/dashboard"
          className={`mb-1 block rounded-lg px-3 py-2 text-sm font-medium ${
            pathname === "/zaa/dashboard"
              ? "bg-indigo-600 text-white"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          Home
        </Link>
        {groups.map((g) => (
          <div key={g.id} className="mt-1">
            <button
              type="button"
              onClick={() => setOpen(g.id)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:bg-slate-50"
            >
              {g.label}
              <span>{open === g.id ? "–" : "+"}</span>
            </button>
            {open === g.id && (
              <div className="ml-2 space-y-0.5">
                {g.links.map((l) => {
                  const active = pathname === l.href || pathname.startsWith(l.href + "/");
                  return (
                    <Link
                      key={l.href}
                      href={l.href}
                      className={`block rounded-lg px-3 py-1.5 text-sm ${
                        active
                          ? "bg-indigo-50 font-semibold text-indigo-800"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {l.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="space-y-1 border-t border-slate-100 p-3">
        <Link href="/zaa" className="block px-2 py-1 text-sm text-slate-600 hover:underline">
          View shop
        </Link>
        <button
          type="button"
          onClick={logout}
          className="w-full rounded-lg px-2 py-1.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
