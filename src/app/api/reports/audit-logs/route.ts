import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const user = searchParams.get("user"); // e.g. "admin@gmail.com" or "ALL"
    const action = searchParams.get("action"); // e.g. "CREATE_PRODUCT", "UPDATE_PRODUCT", etc.
    const search = (searchParams.get("search") || "").trim();
    const format = searchParams.get("format");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (user && user !== "ALL") {
      where.performedBy = { contains: user, mode: "insensitive" };
    }

    if (action && action !== "ALL") {
      where.action = action;
    }

    if (search) {
      where.OR = [
        { sku: { contains: search, mode: "insensitive" } },
        { productName: { contains: search, mode: "insensitive" } },
        { entityId: { contains: search, mode: "insensitive" } },
        { details: { contains: search, mode: "insensitive" } },
        { performedBy: { contains: search, mode: "insensitive" } },
      ];
    }

    // CSV direct export
    if (format === "csv") {
      const allLogs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 2000,
      });

      const headers = [
        "Srno",
        "Timestamp",
        "User (Performed By)",
        "Action",
        "Entity",
        "Entity ID / SKU",
        "Product Name",
        "Details",
      ];

      const csvLines = [
        headers.join(","),
        ...allLogs.map((l, idx) =>
          [
            idx + 1,
            `"${new Date(l.createdAt).toLocaleString("en-IN")}"`,
            `"${(l.performedBy || "Admin").replace(/"/g, '""')}"`,
            `"${l.action}"`,
            `"${l.entity || ""}"`,
            `"${(l.sku || l.entityId || "").replace(/"/g, '""')}"`,
            `"${(l.productName || "").replace(/"/g, '""')}"`,
            `"${(l.details || "").replace(/"/g, '""')}"`,
          ].join(",")
        ),
      ];

      const csvWithBom = "\uFEFF" + csvLines.join("\r\n");

      return new NextResponse(csvWithBom, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="user_activity_logs_${new Date()
            .toISOString()
            .slice(0, 10)}.csv"`,
        },
      });
    }

    const [logs, total, distinctUsers, distinctActions] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        select: { performedBy: true },
        distinct: ["performedBy"],
      }),
      prisma.auditLog.findMany({
        select: { action: true },
        distinct: ["action"],
      }),
    ]);

    return NextResponse.json({
      success: true,
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      users: distinctUsers.map((u) => u.performedBy).filter(Boolean),
      actions: distinctActions.map((a) => a.action).filter(Boolean),
    });
  } catch (error: any) {
    console.error("GET /api/reports/audit-logs error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

