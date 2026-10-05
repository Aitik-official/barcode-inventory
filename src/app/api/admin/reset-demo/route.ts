import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, confirmText } = body;

    if (confirmText !== "RESET") {
      return NextResponse.json(
        { error: 'Confirmation failed. You must type "RESET" to proceed.' },
        { status: 400 }
      );
    }

    if (action === "CLEAR_TRANSACTIONS") {
      // 1. Wipe test orders, invoices, enquiries, quotations, purchase orders & transactions
      await prisma.invoice.deleteMany({});
      await prisma.orderItem.deleteMany({});
      await prisma.order.deleteMany({});
      await prisma.marketplaceOrderItem.deleteMany({});
      await prisma.marketplaceOrder.deleteMany({});
      await prisma.quotation.deleteMany({});
      await prisma.enquiry.deleteMany({});
      await prisma.inventoryTransaction.deleteMany({});
      await prisma.printJob.deleteMany({});
      await prisma.waste.deleteMany({});
      await prisma.purchaseOrderItem.deleteMany({});
      await prisma.purchaseOrder.deleteMany({});

      // Reset unit barcodes back to AVAILABLE
      await prisma.unitBarcode.updateMany({
        where: { status: "SOLD" },
        data: {
          status: "AVAILABLE",
          soldAt: null,
        },
      });

      // Recalculate inventory counts
      const variants = await prisma.productVariant.findMany({
        include: {
          unitBarcodes: {
            where: { status: "AVAILABLE" },
          },
        },
      });

      for (const v of variants) {
        const availableCount = v.unitBarcodes.length;
        await prisma.inventory.upsert({
          where: { productVariantId: v.id },
          create: {
            productVariantId: v.id,
            quantity: availableCount,
            warehouse: "MAIN",
          },
          update: {
            quantity: availableCount,
            reservedQuantity: 0,
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: "All demo transactions, orders, invoices, and sales history cleared. Inventory stock resynced.",
      });
    } else if (action === "FACTORY_RESET") {
      // 2. Full Factory Reset: Wipe all demo data completely for fresh production start
      await prisma.invoice.deleteMany({});
      await prisma.orderItem.deleteMany({});
      await prisma.order.deleteMany({});
      await prisma.marketplaceOrderItem.deleteMany({});
      await prisma.marketplaceOrder.deleteMany({});
      await prisma.quotation.deleteMany({});
      await prisma.enquiry.deleteMany({});
      await prisma.inventoryTransaction.deleteMany({});
      await prisma.printJob.deleteMany({});
      await prisma.waste.deleteMany({});
      await prisma.customerStock.deleteMany({});
      await prisma.purchaseOrderItem.deleteMany({});
      await prisma.purchaseOrder.deleteMany({});
      await prisma.unitBarcode.deleteMany({});
      await prisma.inventory.deleteMany({});
      await prisma.productVariant.deleteMany({});
      await prisma.product.deleteMany({});
      await prisma.category.deleteMany({});
      await prisma.customer.deleteMany({});
      await prisma.supplier.deleteMany({});

      // Ensure superadmin user exists
      const userCount = await prisma.user.count();
      if (userCount === 0) {
        await prisma.user.create({
          data: {
            name: "Super Admin",
            email: "admin@barcodezaa.com",
            role: "SUPER_ADMIN",
            isSuperAdmin: true,
            password: "admin123",
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: "Full Factory Reset complete! Database is 100% clean and ready for production data entry.",
      });
    }

    return NextResponse.json({ error: "Invalid reset action specified." }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/admin/reset-demo error:", error);
    return NextResponse.json({ error: error.message || "Reset failed" }, { status: 500 });
  }
}
