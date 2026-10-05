import Link from "next/link";

export function ZaaShopHeader() {
  return (
    <header className="sticky top-11 z-30 border-b border-indigo-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/zaa" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
            Az
          </span>
          <span>
            <span className="block text-base font-bold text-slate-900">Adminzaa</span>
            <span className="block text-[11px] text-slate-500">Office products & services</span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm font-medium">
          <Link href="/zaa" className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100">
            Home
          </Link>
          <Link href="/zaa/products" className="rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-100">
            Products
          </Link>
          <Link
            href="/zaa/login"
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-white hover:bg-indigo-700"
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
