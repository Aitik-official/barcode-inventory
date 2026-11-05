import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format"); // "csv" | "json"
    const search = (searchParams.get("search") || "").trim().toLowerCase();
    const statusFilter = searchParams.get("status"); // "ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK"
    const userFilter = searchParams.get("user"); // filter by specific user/actor

    const products = await prisma.product.findMany({
      include: {
        category: true,
        variants: {
          include: {
            inventory: true,
            unitBarcodes: {
              select: {
                id: true,
                status: true,
                isReturned: true,
                reason: true,
                generatedBy: true,
              },
            },
            wasteRecords: {
              select: {
                quantity: true,
                recordedBy: true,
              },
            },
            transactions: {
              select: {
                transactionType: true,
                quantity: true,
                performedBy: true,
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
              take: 5,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    let srNo = 1;
    const rows: Array<{
      srNo: number;
      productName: string;
      sku: string;
      openingStock: number;
      sold: number;
      returns: number;
      damage: number;
      closingStock: number;
      stockStatus: string;
      lastActedBy: string;
      lastAction: string;
      lastActedAt: string;
      offerPrice: number;
      valuation: number;
      category: string;
    }> = [];

    for (const prod of products) {
      const pVariants = prod.variants && prod.variants.length > 0 ? prod.variants : [];
      for (const v of pVariants) {
        const barcodes = v.unitBarcodes || [];
        const invQty = v.inventory?.quantity ?? 0;

        // 1. Closing Stock (Available)
        const availableBarcodes = barcodes.filter((b) => b.status === "AVAILABLE").length;
        const closingStock = barcodes.length > 0 ? availableBarcodes : Math.max(0, invQty);

        // 2. Sold
        const soldBarcodes = barcodes.filter((b) => b.status === "SOLD").length;
        const soldTxs = (v.transactions || [])
          .filter((t) => t.transactionType === "SALE")
          .reduce((sum, t) => sum + Math.abs(t.quantity), 0);
        const sold = Math.max(soldBarcodes, soldTxs);

        // 3. Return
        const returnBarcodes = barcodes.filter(
          (b) =>
            b.isReturned ||
            (b.reason &&
              (b.reason.toLowerCase().includes("return") ||
                b.reason.toLowerCase().includes("restock")))
        ).length;
        const returnTxs = (v.transactions || [])
          .filter((t) => t.transactionType === "RETURN")
          .reduce((sum, t) => sum + Math.abs(t.quantity), 0);
        const returns = Math.max(returnBarcodes, returnTxs);

        // 4. Damage
        const damagedBarcodes = barcodes.filter((b) => b.status === "DAMAGED").length;
        const wasteQty = (v.wasteRecords || []).reduce((sum, w) => sum + (w.quantity || 0), 0);
        const damageTxs = (v.transactions || [])
          .filter((t) => t.transactionType === "DAMAGE")
          .reduce((sum, t) => sum + Math.abs(t.quantity), 0);
        const damage = Math.max(damagedBarcodes, wasteQty, damageTxs);

        // 5. Opening Stock
        // Formula: Opening = Closing + Sold + Damage - Return
        const calculatedOpening = closingStock + sold + damage - returns;
        const openingStock = Math.max(calculatedOpening, barcodes.length, closingStock);

        // 6. Stock Status
        let stockStatus = "In Stock";
        if (closingStock === 0) {
          stockStatus = "Out of Stock";
        } else if (closingStock <= 5) {
          stockStatus = "Low Stock";
        }

        // 7. Last Acted Person & Action
        const lastActedBy =
          v.lastActedBy ||
          v.transactions?.[0]?.performedBy ||
          barcodes[0]?.generatedBy ||
          "Admin";
        const lastAction =
          v.lastAction ||
          v.transactions?.[0]?.transactionType ||
          "INITIALIZED";
        const lastActedAtRaw =
          v.lastActedAt ||
          v.transactions?.[0]?.createdAt ||
          v.updatedAt ||
          prod.updatedAt;
        const lastActedAt = new Date(lastActedAtRaw).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        const price = prod.offerPrice || v.sellingPrice || 0;
        const valuation = closingStock * price;

        rows.push({
          srNo: srNo++,
          productName: prod.name,
          sku: v.sku,
          openingStock,
          sold,
          returns,
          damage,
          closingStock,
          stockStatus,
          lastActedBy,
          lastAction,
          lastActedAt,
          offerPrice: price,
          valuation,
          category: prod.category?.name || "General",
        });
      }
    }

    // Filter by search, status, and user
    let filteredRows = rows;
    if (search) {
      filteredRows = filteredRows.filter(
        (r) =>
          r.productName.toLowerCase().includes(search) ||
          r.sku.toLowerCase().includes(search) ||
          r.category.toLowerCase().includes(search) ||
          r.lastActedBy.toLowerCase().includes(search)
      );
    }
    if (statusFilter && statusFilter !== "ALL") {
      const targetStatus =
        statusFilter === "OUT_OF_STOCK"
          ? "Out of Stock"
          : statusFilter === "LOW_STOCK"
          ? "Low Stock"
          : "In Stock";
      filteredRows = filteredRows.filter((r) => r.stockStatus === targetStatus);
    }
    if (userFilter && userFilter !== "ALL") {
      filteredRows = filteredRows.filter((r) =>
        r.lastActedBy.toLowerCase().includes(userFilter.toLowerCase())
      );
    }

    // Re-index filtered rows
    filteredRows = filteredRows.map((r, i) => ({ ...r, srNo: i + 1 }));

    // CSV format output
    if (format === "csv") {
      const headers = [
        "Srno",
        "product name",
        "Sku",
        "Opening stock",
        "Sold",
        "Return",
        "Damage",
        "Closing stock",
        "Stock status",
        "Last Acted By",
        "Last Action",
        "Last Acted At",
      ];

      const csvLines = [
        headers.join(","),
        ...filteredRows.map((r) =>
          [
            r.srNo,
            `"${r.productName.replace(/"/g, '""')}"`,
            `"${r.sku.replace(/"/g, '""')}"`,
            r.openingStock,
            r.sold,
            r.returns,
            r.damage,
            r.closingStock,
            `"${r.stockStatus}"`,
            `"${r.lastActedBy.replace(/"/g, '""')}"`,
            `"${r.lastAction.replace(/"/g, '""')}"`,
            `"${r.lastActedAt}"`,
          ].join(",")
        ),
      ];

      // Add UTF-8 BOM so Excel opens with proper encoding
      const csvWithBom = "\uFEFF" + csvLines.join("\r\n");

      return new NextResponse(csvWithBom, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="inventory_movement_report_${new Date()
            .toISOString()
            .slice(0, 10)}.csv"`,
        },
      });
    }

    // JSON response with totals summary
    const summary = {
      totalItems: filteredRows.length,
      totalOpeningStock: filteredRows.reduce((sum, r) => sum + r.openingStock, 0),
      totalSold: filteredRows.reduce((sum, r) => sum + r.sold, 0),
      totalReturns: filteredRows.reduce((sum, r) => sum + r.returns, 0),
      totalDamage: filteredRows.reduce((sum, r) => sum + r.damage, 0),
      totalClosingStock: filteredRows.reduce((sum, r) => sum + r.closingStock, 0),
      totalValuation: filteredRows.reduce((sum, r) => sum + r.valuation, 0),
      inStockCount: filteredRows.filter((r) => r.stockStatus === "In Stock").length,
      lowStockCount: filteredRows.filter((r) => r.stockStatus === "Low Stock").length,
      outOfStockCount: filteredRows.filter((r) => r.stockStatus === "Out of Stock").length,
      distinctUsers: Array.from(new Set(rows.map((r) => r.lastActedBy))).filter(Boolean),
    };

    return NextResponse.json({
      success: true,
      summary,
      rows: filteredRows,
    });
  } catch (error: any) {
    console.error("GET /api/reports/inventory-export error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
