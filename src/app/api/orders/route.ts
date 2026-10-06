import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";

const lineSchema = z.object({
  variantId: z.string(),
  quantity: z.number().int().min(1),
});

const schema = z.object({
  lines: z.array(lineSchema).min(1),
});

// Helper to upsert a customer profile and reuse across orders
export async function upsertCustomerRecord({
  name,
  email,
  phone,
  address,
  city,
  state,
  zip,
  company,
  gstin,
}: {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  company?: string | null;
  gstin?: string | null;
}) {
  if (!name && !email && !phone) return null;

  const cleanName = (name || "Valued Customer").trim();
  const rawEmail = email?.trim().toLowerCase();
  const cleanEmail =
    rawEmail && !rawEmail.includes("@example")
      ? rawEmail
      : `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "") || "cust"}_${Date.now()}@customer.local`;
  const cleanPhone = phone?.trim() || null;
  const username = `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "") || "cust"}_${Math.floor(
    1000 + Math.random() * 9000
  )}`;

  try {
    // Check if customer exists by real email or phone
    let existing = null;
    if (cleanPhone || (rawEmail && !rawEmail.endsWith("@customer.local") && !rawEmail.endsWith("@dispatch.local"))) {
      existing = await prisma.customer.findFirst({
        where: {
          OR: [
            ...(rawEmail && !rawEmail.endsWith("@customer.local") && !rawEmail.endsWith("@dispatch.local")
              ? [{ email: rawEmail }]
              : []),
            ...(cleanPhone ? [{ phone: cleanPhone }] : []),
          ],
        },
      });
    }

    if (existing) {
      existing = await prisma.customer.update({
        where: { id: existing.id },
        data: {
          name: cleanName || existing.name,
          phone: cleanPhone || existing.phone,
          address: address || existing.address,
          city: city || existing.city,
          state: state || existing.state,
          zip: zip || existing.zip,
          company: company || existing.company,
          gstin: gstin || existing.gstin,
        },
      });
      return existing;
    }

    const created = await prisma.customer.create({
      data: {
        name: cleanName,
        username,
        email: cleanEmail,
        phone: cleanPhone,
        company: company || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        gstin: gstin || null,
        status: "ACTIVE",
      },
    });
    return created;
  } catch (err) {
    console.warn("Could not upsert customer record:", err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("id");

    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              productVariant: { include: { product: true } },
              unitBarcode: true,
            },
          },
          customer: true,
          invoices: true,
        },
      });

      if (!order) {
        const mOrder = await prisma.marketplaceOrder.findUnique({
          where: { id: orderId },
          include: { items: true, credential: true },
        });
        if (!mOrder) {
          return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }
        return NextResponse.json({ order: mOrder, isMarketplace: true });
      }

      return NextResponse.json({ order, isMarketplace: false });
    }

    const [orders, marketplaceOrders] = await Promise.all([
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: {
              productVariant: { include: { product: true } },
              unitBarcode: true,
            },
          },
          customer: true,
          invoices: true,
        },
      }),
      prisma.marketplaceOrder.findMany({
        orderBy: { orderDate: "desc" },
        include: { items: true, credential: true },
      }),
    ]);

    return NextResponse.json({ orders, marketplaceOrders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      orderId,
      orderNumber,
      status,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      buyerCity,
      buyerState,
      buyerPincode,
      trackingNumber,
      courier,
      notes,
      saveCustomer,
      company,
      gstin,
    } = body;

    if (!orderId && !orderNumber) {
      return NextResponse.json({ error: "orderId or orderNumber is required" }, { status: 400 });
    }

    // Try finding local Order first
    const localOrder = await prisma.order.findFirst({
      where: {
        OR: [
          ...(orderId ? [{ id: orderId }] : []),
          ...(orderNumber ? [{ orderNumber }] : []),
        ],
      },
      include: { customer: true },
    });

    if (localOrder) {
      let linkedCustomerId = localOrder.customerId;

      // If requested or customer info changed, upsert customer record
      if (saveCustomer || !linkedCustomerId) {
        const cust = await upsertCustomerRecord({
          name: customerName || localOrder.customerName,
          email: customerEmail || localOrder.customerEmail,
          phone: customerPhone || localOrder.customerPhone,
          address: shippingAddress || localOrder.shippingAddress,
          city: buyerCity,
          state: buyerState,
          zip: buyerPincode,
          company: company || localOrder.company,
          gstin: gstin || localOrder.gstin,
        });
        if (cust) {
          linkedCustomerId = cust.id;
        }
      }

      // Update notes if courier/tracking changed
      let updatedNotes = notes !== undefined ? notes : localOrder.notes;
      if (trackingNumber || courier) {
        if (!updatedNotes) updatedNotes = "";
        if (courier && !updatedNotes.includes(`Courier: ${courier}`)) {
          updatedNotes += ` | Courier: ${courier}`;
        }
        if (trackingNumber && !updatedNotes.includes(`AWB: ${trackingNumber}`)) {
          updatedNotes += ` | AWB: ${trackingNumber}`;
        }
      }

      const updated = await prisma.order.update({
        where: { id: localOrder.id },
        data: {
          ...(status ? { status } : {}),
          ...(customerName ? { customerName } : {}),
          ...(customerEmail ? { customerEmail } : {}),
          ...(customerPhone !== undefined ? { customerPhone } : {}),
          ...(shippingAddress ? { shippingAddress } : {}),
          ...(company !== undefined ? { company } : {}),
          ...(gstin !== undefined ? { gstin } : {}),
          ...(updatedNotes !== undefined ? { notes: updatedNotes } : {}),
          ...(linkedCustomerId ? { customerId: linkedCustomerId } : {}),
        },
        include: {
          items: {
            include: {
              productVariant: { include: { product: true } },
              unitBarcode: true,
            },
          },
          customer: true,
        },
      });

      await writeAudit({
        action: "ORDER_UPDATED",
        entity: "Order",
        entityId: updated.id,
        details: JSON.stringify({
          orderNumber: updated.orderNumber,
          status: updated.status,
          customerName: updated.customerName,
        }),
      });

      return NextResponse.json({
        success: true,
        order: updated,
        isMarketplace: false,
        message: `Order #${updated.orderNumber} status updated to '${updated.status}'!`,
      });
    }

    // Try finding Marketplace Order
    const mOrder = await prisma.marketplaceOrder.findFirst({
      where: {
        OR: [
          ...(orderId ? [{ id: orderId }] : []),
          ...(orderNumber ? [{ channelOrderId: orderNumber }] : []),
        ],
      },
      include: { items: true },
    });

    if (mOrder) {
      // If saving customer
      if (saveCustomer || customerName || mOrder.buyerName) {
        await upsertCustomerRecord({
          name: customerName || mOrder.buyerName || `${mOrder.channel} Customer`,
          email: customerEmail || undefined,
          phone: customerPhone || undefined,
          address: shippingAddress || mOrder.shippingAddress,
          city: buyerCity || mOrder.buyerCity,
          state: buyerState || mOrder.buyerState,
          zip: buyerPincode || mOrder.buyerPincode,
          company: company || undefined,
          gstin: gstin || undefined,
        });
      }

      const updated = await prisma.marketplaceOrder.update({
        where: { id: mOrder.id },
        data: {
          ...(status ? { orderStatus: status } : {}),
          ...(customerName ? { buyerName: customerName } : {}),
          ...(buyerCity ? { buyerCity } : {}),
          ...(buyerState ? { buyerState } : {}),
          ...(buyerPincode ? { buyerPincode } : {}),
          ...(shippingAddress ? { shippingAddress } : {}),
          ...(trackingNumber ? { trackingNumber } : {}),
          ...(courier ? { courier } : {}),
          ...(status === "SHIPPED" && !mOrder.dispatchedAt ? { dispatchedAt: new Date() } : {}),
        },
        include: { items: true, credential: true },
      });

      await writeAudit({
        action: "MARKETPLACE_ORDER_UPDATED",
        entity: "MarketplaceOrder",
        entityId: updated.id,
        details: JSON.stringify({
          channelOrderId: updated.channelOrderId,
          status: updated.orderStatus,
          buyerName: updated.buyerName,
        }),
      });

      return NextResponse.json({
        success: true,
        order: updated,
        isMarketplace: true,
        message: `Marketplace Order #${updated.channelOrderId} status updated to '${updated.orderStatus}'!`,
      });
    }

    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  } catch (err: any) {
    console.error("PATCH /api/orders error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { lines } = schema.parse(await req.json());

    const orderId = `ORD-${Date.now()}`;

    await prisma.$transaction(async (tx) => {
      for (const line of lines) {
        const inv = await tx.inventory.findUnique({
          where: { productVariantId: line.variantId },
        });
        if (!inv) throw new Error("Inventory not found for a cart item");

        const previousStock = inv.quantity;
        const newStock = previousStock - line.quantity;
        if (newStock < 0) {
          throw new Error(
            `Insufficient stock. Available quantity: ${previousStock}`
          );
        }

        await tx.inventory.update({
          where: { productVariantId: line.variantId },
          data: { quantity: newStock },
        });

        await tx.inventoryTransaction.create({
          data: {
            productVariantId: line.variantId,
            transactionType: "SALE",
            quantity: line.quantity,
            previousStock,
            newStock,
            referenceType: "ORDER",
            referenceId: orderId,
          },
        });
      }
    });

    await writeAudit({
      action: "SALE_CREATED",
      entity: "Order",
      entityId: orderId,
      details: JSON.stringify({ lines }),
    });

    return NextResponse.json({ orderId, status: "COMPLETED", lines });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sale failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryId = searchParams.get("id");
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      // Body is optional if query param is passed
    }

    const targetIds: string[] = body?.ids || (queryId ? [queryId] : body?.id ? [body.id] : []);

    if (targetIds.length === 0) {
      return NextResponse.json({ error: "No order ID provided for deletion." }, { status: 400 });
    }

    let deletedCount = 0;

    for (const orderId of targetIds) {
      // 1. Try standard Order
      const standardOrder = await prisma.order.findFirst({
        where: { OR: [{ id: orderId }, { orderNumber: orderId }] },
        include: { items: true },
      });

      if (standardOrder) {
        // Free sold unit barcodes associated with this order
        const unitBarcodeIds = standardOrder.items
          .map((i) => i.unitBarcodeId)
          .filter(Boolean) as string[];

        if (unitBarcodeIds.length > 0) {
          await prisma.unitBarcode.updateMany({
            where: { id: { in: unitBarcodeIds } },
            data: { status: "AVAILABLE", soldAt: null },
          });
        }

        // Delete order invoices & items & order
        await prisma.invoice.deleteMany({
          where: { OR: [{ orderId: standardOrder.id }, { orderId: standardOrder.orderNumber }] },
        });
        await prisma.orderItem.deleteMany({ where: { orderId: standardOrder.id } });
        await prisma.order.delete({ where: { id: standardOrder.id } });

        deletedCount++;
        continue;
      }

      // 2. Try MarketplaceOrder
      const mpOrder = await prisma.marketplaceOrder.findFirst({
        where: { OR: [{ id: orderId }, { channelOrderId: orderId }] },
        include: { items: true },
      });

      if (mpOrder) {
        await prisma.invoice.deleteMany({
          where: { OR: [{ orderId: mpOrder.id }, { orderId: mpOrder.channelOrderId }] },
        });
        await prisma.marketplaceOrderItem.deleteMany({
          where: { marketplaceOrderId: mpOrder.id },
        });
        await prisma.marketplaceOrder.delete({ where: { id: mpOrder.id } });

        deletedCount++;
      }
    }

    await writeAudit({
      action: "ORDERS_DELETED",
      entity: "Order",
      entityId: targetIds.join(", "),
      details: JSON.stringify({ deletedCount, targetIds }),
    });

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Successfully deleted ${deletedCount} order(s).`,
    });
  } catch (err: any) {
    console.error("DELETE /api/orders error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete order(s)." },
      { status: 500 }
    );
  }
}

