import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCarrierTracking, TrackingCheckpoint } from "@/lib/trackingEngine";
import { writeAudit, resolveActor } from "@/lib/audit";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");
    const orderNumber = searchParams.get("orderNumber");

    if (!orderId && !orderNumber) {
      return NextResponse.json({ error: "orderId or orderNumber is required" }, { status: 400 });
    }

    // Check standard Order
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          ...(orderId ? [{ id: orderId }] : []),
          ...(orderNumber ? [{ orderNumber }] : []),
        ],
      },
      include: {
        items: true,
        customer: true,
      },
    });

    if (order) {
      let existingCheckpoints: TrackingCheckpoint[] = [];
      if (order.trackingData) {
        try {
          existingCheckpoints = JSON.parse(order.trackingData);
        } catch {}
      }

      // Extract courier & tracking from notes if not set explicitly
      let courier = order.channel === "AMAZON" ? "Amazon ATS Logistics (Easy Ship)" : order.channel === "FLIPKART" ? "Flipkart Ekart Logistics" : "Express Logistics";
      let trackingNumber = order.deliveryId || "";

      if (order.notes) {
        const courierMatch = order.notes.match(/Courier:\s*([^|]+)/i);
        if (courierMatch && courierMatch[1]) courier = courierMatch[1].trim();

        const awbMatch = order.notes.match(/AWB:\s*([^|]+)/i);
        if (awbMatch && awbMatch[1]) trackingNumber = awbMatch[1].trim();
      }

      const tracking = generateCarrierTracking({
        channel: order.channel,
        orderNumber: order.orderNumber,
        deliveryId: order.deliveryId,
        trackingNumber: trackingNumber || undefined,
        courier,
        buyerCity: order.customer?.city || "Mumbai",
        buyerState: order.customer?.state || "Maharashtra",
        shippingAddress: order.shippingAddress,
        createdAt: order.createdAt,
        status: order.status,
        existingCheckpoints,
      });

      // Cache updated tracking data in order if not already stored
      if (!order.trackingData || existingCheckpoints.length < tracking.checkpoints.length) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            trackingData: JSON.stringify(tracking.checkpoints),
            deliveryId: order.deliveryId || tracking.deliveryId,
          },
        }).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        isMarketplace: false,
        tracking,
      });
    }

    // Check Marketplace Order
    const mpOrder = await prisma.marketplaceOrder.findFirst({
      where: {
        OR: [
          ...(orderId ? [{ id: orderId }] : []),
          ...(orderNumber ? [{ channelOrderId: orderNumber }] : []),
        ],
      },
      include: {
        items: true,
      },
    });

    if (mpOrder) {
      let existingCheckpoints: TrackingCheckpoint[] = [];
      if (mpOrder.trackingData) {
        try {
          existingCheckpoints = JSON.parse(mpOrder.trackingData);
        } catch {}
      }

      const courier =
        mpOrder.courier ||
        (mpOrder.channel === "AMAZON" ? "Amazon ATS Logistics (Easy Ship)" : "Flipkart Ekart Logistics");

      const tracking = generateCarrierTracking({
        channel: mpOrder.channel,
        orderNumber: mpOrder.channelOrderId,
        deliveryId: mpOrder.deliveryId,
        trackingNumber: mpOrder.trackingNumber,
        courier,
        buyerCity: mpOrder.buyerCity || "New Delhi",
        buyerState: mpOrder.buyerState || "Delhi",
        shippingAddress: mpOrder.shippingAddress,
        createdAt: mpOrder.orderDate || mpOrder.createdAt,
        status: mpOrder.orderStatus,
        existingCheckpoints,
      });

      if (!mpOrder.trackingData || existingCheckpoints.length < tracking.checkpoints.length) {
        await prisma.marketplaceOrder.update({
          where: { id: mpOrder.id },
          data: {
            trackingData: JSON.stringify(tracking.checkpoints),
            trackingNumber: mpOrder.trackingNumber || tracking.trackingNumber,
            courier: mpOrder.courier || tracking.carrier,
            deliveryId: mpOrder.deliveryId || tracking.deliveryId,
          },
        }).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        isMarketplace: true,
        tracking,
      });
    }

    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  } catch (error: any) {
    console.error("GET /api/orders/tracking error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      orderId,
      orderNumber,
      action = "SYNC", // "SYNC" | "ADD_CHECKPOINT" | "UPDATE_CARRIER"
      customCheckpoint,
      courier,
      trackingNumber,
      deliveryId,
      status,
    } = body;

    if (!orderId && !orderNumber) {
      return NextResponse.json({ error: "orderId or orderNumber is required" }, { status: 400 });
    }

    const actor = resolveActor(req, "Admin");

    // Check standard Order
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          ...(orderId ? [{ id: orderId }] : []),
          ...(orderNumber ? [{ orderNumber }] : []),
        ],
      },
      include: { customer: true },
    });

    if (order) {
      let checkpoints: TrackingCheckpoint[] = [];
      if (order.trackingData) {
        try {
          checkpoints = JSON.parse(order.trackingData);
        } catch {}
      }

      if (action === "ADD_CHECKPOINT" && customCheckpoint) {
        const newCp: TrackingCheckpoint = {
          id: `cp-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          status: customCheckpoint.status || "IN_TRANSIT",
          title: customCheckpoint.title || "Carrier Tracking Update",
          location: customCheckpoint.location || "Local Hub / Carrier Facility",
          timestamp: customCheckpoint.timestamp || new Date().toISOString(),
          courier: courier || order.channel === "AMAZON" ? "Amazon ATS" : "Ekart",
          trackingNumber: trackingNumber || order.deliveryId || undefined,
          details: customCheckpoint.details || "Status updated via carrier tracking sync",
          isCustom: true,
        };
        checkpoints.push(newCp);
      } else {
        // Re-generate & sync
        const activeCourier = courier || (order.channel === "AMAZON" ? "Amazon ATS Logistics (Easy Ship)" : order.channel === "FLIPKART" ? "Flipkart Ekart Logistics" : "Express Logistics");
        const activeTracking = trackingNumber || order.deliveryId || undefined;

        const generated = generateCarrierTracking({
          channel: order.channel,
          orderNumber: order.orderNumber,
          deliveryId: deliveryId || order.deliveryId,
          trackingNumber: activeTracking,
          courier: activeCourier,
          buyerCity: order.customer?.city || "Mumbai",
          buyerState: order.customer?.state || "Maharashtra",
          shippingAddress: order.shippingAddress,
          createdAt: order.createdAt,
          status: status || order.status,
          existingCheckpoints: checkpoints,
        });

        checkpoints = generated.checkpoints;
      }

      const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          trackingData: JSON.stringify(checkpoints),
          ...(deliveryId ? { deliveryId } : {}),
          ...(status ? { status } : {}),
        },
      });

      await writeAudit({
        action: action === "ADD_CHECKPOINT" ? "ADD_TRACKING_CHECKPOINT" : "SYNC_CARRIER_TRACKING",
        entity: "Order",
        entityId: order.id,
        details: `Updated tracking checkpoints for order #${order.orderNumber} (${order.channel || "Standard"}). Total checkpoints: ${checkpoints.length}`,
        performedBy: actor,
      });

      const trackingResult = generateCarrierTracking({
        channel: updated.channel,
        orderNumber: updated.orderNumber,
        deliveryId: updated.deliveryId,
        trackingNumber: trackingNumber || updated.deliveryId || undefined,
        courier: courier || undefined,
        buyerCity: order.customer?.city || "Mumbai",
        buyerState: order.customer?.state || "Maharashtra",
        shippingAddress: updated.shippingAddress,
        createdAt: updated.createdAt,
        status: updated.status,
        existingCheckpoints: checkpoints,
      });

      return NextResponse.json({
        success: true,
        message: `Tracking updated for #${updated.orderNumber}`,
        tracking: trackingResult,
      });
    }

    // Check Marketplace Order
    const mpOrder = await prisma.marketplaceOrder.findFirst({
      where: {
        OR: [
          ...(orderId ? [{ id: orderId }] : []),
          ...(orderNumber ? [{ channelOrderId: orderNumber }] : []),
        ],
      },
    });

    if (mpOrder) {
      let checkpoints: TrackingCheckpoint[] = [];
      if (mpOrder.trackingData) {
        try {
          checkpoints = JSON.parse(mpOrder.trackingData);
        } catch {}
      }

      if (action === "ADD_CHECKPOINT" && customCheckpoint) {
        const newCp: TrackingCheckpoint = {
          id: `cp-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          status: customCheckpoint.status || "IN_TRANSIT",
          title: customCheckpoint.title || "Carrier Tracking Update",
          location: customCheckpoint.location || `${mpOrder.buyerCity || "Destination Center"} Hub`,
          timestamp: customCheckpoint.timestamp || new Date().toISOString(),
          courier: courier || mpOrder.courier || (mpOrder.channel === "AMAZON" ? "Amazon ATS" : "Ekart"),
          trackingNumber: trackingNumber || mpOrder.trackingNumber || undefined,
          details: customCheckpoint.details || "Status updated via carrier tracking sync",
          isCustom: true,
        };
        checkpoints.push(newCp);
      } else {
        const activeCourier = courier || mpOrder.courier || (mpOrder.channel === "AMAZON" ? "Amazon ATS Logistics (Easy Ship)" : "Flipkart Ekart Logistics");
        const activeTracking = trackingNumber || mpOrder.trackingNumber || mpOrder.deliveryId || undefined;

        const generated = generateCarrierTracking({
          channel: mpOrder.channel,
          orderNumber: mpOrder.channelOrderId,
          deliveryId: deliveryId || mpOrder.deliveryId,
          trackingNumber: activeTracking,
          courier: activeCourier,
          buyerCity: mpOrder.buyerCity || "New Delhi",
          buyerState: mpOrder.buyerState || "Delhi",
          shippingAddress: mpOrder.shippingAddress,
          createdAt: mpOrder.orderDate || mpOrder.createdAt,
          status: status || mpOrder.orderStatus,
          existingCheckpoints: checkpoints,
        });

        checkpoints = generated.checkpoints;
      }

      const updatedMp = await prisma.marketplaceOrder.update({
        where: { id: mpOrder.id },
        data: {
          trackingData: JSON.stringify(checkpoints),
          ...(courier ? { courier } : {}),
          ...(trackingNumber ? { trackingNumber } : {}),
          ...(deliveryId ? { deliveryId } : {}),
          ...(status ? { orderStatus: status } : {}),
        },
      });

      await writeAudit({
        action: action === "ADD_CHECKPOINT" ? "ADD_TRACKING_CHECKPOINT" : "SYNC_CARRIER_TRACKING",
        entity: "MarketplaceOrder",
        entityId: mpOrder.id,
        details: `Updated tracking checkpoints for ${mpOrder.channel} order #${mpOrder.channelOrderId}. Total checkpoints: ${checkpoints.length}`,
        performedBy: actor,
      });

      const trackingResult = generateCarrierTracking({
        channel: updatedMp.channel,
        orderNumber: updatedMp.channelOrderId,
        deliveryId: updatedMp.deliveryId,
        trackingNumber: updatedMp.trackingNumber,
        courier: updatedMp.courier,
        buyerCity: updatedMp.buyerCity || "New Delhi",
        buyerState: updatedMp.buyerState || "Delhi",
        shippingAddress: updatedMp.shippingAddress,
        createdAt: updatedMp.orderDate || updatedMp.createdAt,
        status: updatedMp.orderStatus,
        existingCheckpoints: checkpoints,
      });

      return NextResponse.json({
        success: true,
        message: `Tracking updated for ${updatedMp.channel} #${updatedMp.channelOrderId}`,
        tracking: trackingResult,
      });
    }

    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  } catch (error: any) {
    console.error("POST /api/orders/tracking error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
