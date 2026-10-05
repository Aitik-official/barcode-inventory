import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  ScanBarcode,
  Plus,
  QrCode,
  ShoppingBag,
  Boxes,
  FileSpreadsheet,
  ArrowRight,
  Zap,
  Printer,
  Package,
} from "lucide-react";

export const revalidate = 0; // Dynamic server component

export default async function HomePage() {
  const [
    productsCount,
    variantsCount,
    unitBarcodesCount,
    availableBarcodesCount,
    soldBarcodesCount,
    totalStockSum,
    recentTransactions,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.productVariant.count(),
    prisma.unitBarcode.count(),
    prisma.unitBarcode.count({ where: { status: "AVAILABLE" } }),
    prisma.unitBarcode.count({ where: { status: "SOLD" } }),
    prisma.inventory.aggregate({ _sum: { quantity: true } }),
    prisma.inventoryTransaction.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        productVariant: {
          include: { product: true },
        },
        unitBarcode: true,
      },
    }),
  ]);

  return (
    <div className="space-y-8 py-2">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-[#056468] p-8 sm:p-10 border border-[#045255] text-white shadow-md">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/20 text-emerald-100 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            <span>Merged B2B Catalog + Per-Unit Barcode Series Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
            Per-Unit Barcode & Inventory Workspace
          </h1>
          <p className="text-emerald-50/90 text-sm sm:text-base leading-relaxed">
            Every product variant shares a single <strong>SKU</strong>, while <strong>every physical unit item in stock receives its own unique 12-digit Code 128 barcode</strong> generated sequentially from a series!
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              href="/scan"
              className="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-[#044e51] font-semibold text-xs shadow-sm transition-all flex items-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              <span>Open Scanner / POS</span>
            </Link>
            <Link
              href="/products/new"
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-emerald-50 text-[#056468] font-semibold text-xs shadow-sm transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product + Unit Barcodes</span>
            </Link>
            <Link
              href="/barcodes"
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs border border-white/20 transition-all flex items-center gap-2"
            >
              <ScanBarcode className="w-4 h-4" />
              <span>View Barcode Series Registry</span>
            </Link>
          </div>
        </div>
      </div>

      {/* High Visibility Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Metric 1 */}
        <div className="bg-white border border-[#cce7ed] rounded-2xl p-4 shadow-sm space-y-1 flex flex-col justify-between">
          <div className="text-xs font-medium text-slate-500">Total Products</div>
          <div className="text-2xl font-bold text-[#0b252c] tracking-tight">{productsCount}</div>
          <div className="text-xs font-medium text-[#056468]">{variantsCount} SKUs</div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-[#cce7ed] rounded-2xl p-4 shadow-sm space-y-1 flex flex-col justify-between">
          <div className="text-xs font-medium text-slate-500">Total Barcodes</div>
          <div className="text-2xl font-bold text-[#0b252c] tracking-tight">{unitBarcodesCount}</div>
          <div className="text-xs font-medium text-[#056468]">Serial Code 128</div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-[#cce7ed] rounded-2xl p-4 shadow-sm space-y-1 flex flex-col justify-between">
          <div className="text-xs font-medium text-emerald-700">Available Units</div>
          <div className="text-2xl font-bold text-emerald-700 tracking-tight">{availableBarcodesCount}</div>
          <div className="text-xs font-medium text-emerald-600">In Warehouse Stock</div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-[#cce7ed] rounded-2xl p-4 shadow-sm space-y-1 flex flex-col justify-between">
          <div className="text-xs font-medium text-purple-700">Sold Units</div>
          <div className="text-2xl font-bold text-purple-700 tracking-tight">{soldBarcodesCount}</div>
          <div className="text-xs font-medium text-purple-600">Completed Sales</div>
        </div>

        {/* Metric 5 */}
        <div className="bg-white border border-[#cce7ed] rounded-2xl p-4 shadow-sm space-y-1 flex flex-col justify-between">
          <div className="text-xs font-medium text-slate-500">Total Stock Qty</div>
          <div className="text-2xl font-bold text-[#0b252c] tracking-tight">{totalStockSum._sum.quantity ?? 0}</div>
          <div className="text-xs font-medium text-slate-500">Physical Items</div>
        </div>

        {/* Metric 6 */}
        <div className="bg-white border border-[#cce7ed] rounded-2xl p-4 shadow-sm space-y-1 flex flex-col justify-between">
          <div className="text-xs font-medium text-slate-500">Thermal Labels</div>
          <div className="text-2xl font-bold text-[#056468] tracking-tight">Ready</div>
          <div className="text-xs font-medium text-slate-500">50×30 / 50×25 mm</div>
        </div>
      </div>

      {/* Primary Workspace Modules Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-[#0b252c] tracking-tight flex items-center gap-2">
          <span>Primary Workspace Modules</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/products"
            className="group bg-white border border-[#cce7ed] hover:border-[#056468] rounded-2xl p-5 shadow-sm transition-all hover:-translate-y-0.5 flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#e3f2f5] text-[#056468] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Package className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-[#0b252c] group-hover:text-[#056468] transition-colors">
                Products & Catalog
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Manage catalog items, variants, SKUs, categories, MRP, offer prices, and HSN codes.
              </p>
            </div>
            <div className="mt-4 text-xs font-semibold text-[#056468] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              <span>Browse Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            href="/barcodes"
            className="group bg-white border border-[#cce7ed] hover:border-[#056468] rounded-2xl p-5 shadow-sm transition-all hover:-translate-y-0.5 flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#e3f2f5] text-[#056468] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <ScanBarcode className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-[#0b252c] group-hover:text-[#056468] transition-colors">
                Unit Barcodes & Printing
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Browse per-unit barcode series, status (AVAILABLE/SOLD), bulk generate, and thermal label tags.
              </p>
            </div>
            <div className="mt-4 text-xs font-semibold text-[#056468] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              <span>Open Barcode Series</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            href="/scan"
            className="group bg-white border border-[#cce7ed] hover:border-[#056468] rounded-2xl p-5 shadow-sm transition-all hover:-translate-y-0.5 flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#e3f2f5] text-[#056468] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-[#0b252c] group-hover:text-[#056468] transition-colors">
                Scan & POS Checkout
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                USB Hardware scanner or manual lookup for unit barcodes. Add items to cart and sell units.
              </p>
            </div>
            <div className="mt-4 text-xs font-semibold text-[#056468] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              <span>Start Scanning</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            href="/inventory"
            className="group bg-white border border-[#cce7ed] hover:border-[#056468] rounded-2xl p-5 shadow-sm transition-all hover:-translate-y-0.5 flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#e3f2f5] text-[#056468] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Boxes className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-[#0b252c] group-hover:text-[#056468] transition-colors">
                Inventory & Warehouse
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Track stock levels, receive goods, purchase orders (PO), GRNs, and waste write-offs.
              </p>
            </div>
            <div className="mt-4 text-xs font-semibold text-[#056468] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              <span>Manage Warehouse</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Inventory Transactions Activity Ledger */}
      <div className="bg-white border border-[#cce7ed] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-semibold text-[#0b252c] flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#056468]" />
              <span>Realtime Stock & Barcode Activity Ledger</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live audit stream recorded when stock is received, unit barcodes issued, or items sold.
            </p>
          </div>
          <Link
            href="/inventory"
            className="text-xs font-semibold text-[#056468] hover:underline"
          >
            View Complete Stock Ledger →
          </Link>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#cce7ed]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f2f9fa] text-[#0b252c] font-semibold uppercase tracking-wider border-b border-[#cce7ed]">
              <tr>
                <th className="p-3.5">Time</th>
                <th className="p-3.5">Product / SKU</th>
                <th className="p-3.5">Unit Barcode</th>
                <th className="p-3.5">Type</th>
                <th className="p-3.5">Qty Change</th>
                <th className="p-3.5">New Stock</th>
                <th className="p-3.5">Transaction Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {recentTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3.5 text-slate-500">
                    {new Date(tx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="p-3.5">
                    <span className="font-semibold text-[#0b252c] block">
                      {tx.productVariant.product.name}
                    </span>
                    <span className="text-slate-500 font-mono text-[11px]">{tx.productVariant.sku}</span>
                  </td>
                  <td className="p-3.5">
                    {tx.unitBarcode ? (
                      <span className="bg-[#e3f2f5] border border-[#cce7ed] text-[#056468] px-2.5 py-1 rounded-md font-mono font-medium text-[11px]">
                        {tx.unitBarcode.barcode}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-medium ${
                        tx.transactionType === "RECEIVE"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : tx.transactionType === "SALE"
                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {tx.transactionType}
                    </span>
                  </td>
                  <td className="p-3.5 font-semibold text-[#0b252c]">
                    {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}
                  </td>
                  <td className="p-3.5 font-bold text-emerald-700">{tx.newStock}</td>
                  <td className="p-3.5 text-slate-600 max-w-xs truncate">{tx.note || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
