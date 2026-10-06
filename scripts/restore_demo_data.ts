import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Restoring demo orders, customers, marketplace orders, and invoices...");

  // Find or create sample product variants
  let varTshirt = await prisma.productVariant.findFirst({ where: { sku: "TSHIRT-BLK-M" } });
  if (!varTshirt) {
    let apparel = await prisma.category.findFirst({ where: { slug: "apparel" } });
    if (!apparel) {
      apparel = await prisma.category.create({
        data: { name: "Apparel & Garments", slug: "apparel", mainUse: "product" },
      });
    }
    const tshirt = await prisma.product.create({
      data: {
        name: "Black T-Shirt",
        slug: "black-t-shirt-demo",
        categoryId: apparel.id,
        mrp: 999,
        offerPrice: 799,
        variants: {
          create: [{ sku: "TSHIRT-BLK-M", color: "Black", size: "M", purchasePrice: 400, sellingPrice: 799 }],
        },
      },
      include: { variants: true },
    });
    varTshirt = tshirt.variants[0];
  }

  let varCam1 = await prisma.productVariant.findFirst({ where: { sku: "MS-6W5188" } });
  let varCam2 = await prisma.productVariant.findFirst({ where: { sku: "MS-DIYC180" } });
  let varCam3 = await prisma.productVariant.findFirst({ where: { sku: "sentra-charger-wifi-cam" } });

  if (!varCam1 || !varCam2 || !varCam3) {
    let security = await prisma.category.findFirst({ where: { slug: "security-gadgets" } });
    if (!security) {
      security = await prisma.category.create({
        data: { name: "Security Gadgets", slug: "security-gadgets", mainUse: "product" },
      });
    }
    const camProduct = await prisma.product.create({
      data: {
        name: "Micawas Pro Smart Camera Series",
        slug: "micawas-pro-camera-series",
        categoryId: security.id,
        mrp: 6999,
        offerPrice: 4999,
        variants: {
          create: [
            ...(!varCam1 ? [{ sku: "MS-6W5188", color: "Black", size: "4K", purchasePrice: 3200, sellingPrice: 4999 }] : []),
            ...(!varCam2 ? [{ sku: "MS-DIYC180", color: "White", size: "1080P", purchasePrice: 4500, sellingPrice: 7999 }] : []),
            ...(!varCam3 ? [{ sku: "sentra-charger-wifi-cam", color: "Black", size: "Standard", purchasePrice: 1800, sellingPrice: 3299 }] : []),
          ],
        },
      },
      include: { variants: true },
    });
    if (!varCam1) varCam1 = camProduct.variants.find((v) => v.sku === "MS-6W5188") || camProduct.variants[0];
    if (!varCam2) varCam2 = camProduct.variants.find((v) => v.sku === "MS-DIYC180") || camProduct.variants[0];
    if (!varCam3) varCam3 = camProduct.variants.find((v) => v.sku === "sentra-charger-wifi-cam") || camProduct.variants[0];
  }

  // 2. Customers
  const customerPooja = await prisma.customer.upsert({
    where: { email: "pooja.patel@gmail.com" },
    create: {
      name: "Pooja Patel",
      username: "pooja_patel",
      email: "pooja.patel@gmail.com",
      phone: "+91 98112 23344",
      address: "Flat 402, Greenfield Heights, Andheri West",
      city: "Mumbai",
      state: "Maharashtra",
      zip: "400053",
      status: "ACTIVE",
    },
    update: {},
  });

  const customerWalkin = await prisma.customer.upsert({
    where: { email: "walkin@store.local" },
    create: {
      name: "Walk-in Retail Customer",
      username: "walkin_retail",
      email: "walkin@store.local",
      phone: "+91 98200 12345",
      address: "Local Store Counter Pickup, Andheri East",
      city: "Mumbai",
      state: "Maharashtra",
      zip: "400093",
      status: "ACTIVE",
    },
    update: {},
  });

  // 3. Local Orders
  // Order 1: Website Store
  const ord1 = await prisma.order.upsert({
    where: { orderNumber: "ORD-2026-5076" },
    create: {
      orderNumber: "ORD-2026-5076",
      customerId: customerPooja.id,
      customerName: "Pooja Patel",
      customerEmail: "pooja.patel@gmail.com",
      customerPhone: "+91 98112 23344",
      shippingAddress: "Flat 402, Greenfield Heights, Andheri West, Mumbai - 400053",
      totalAmount: 3299,
      status: "Order Placed",
      notes: "Channel: WEBSITE",
      items: {
        create: [
          {
            productVariantId: varCam3.id,
            sku: "sentra-charger-wifi-cam",
            name: "Micawas Sentra Charger WiFi Cam",
            quantity: 1,
            unitPrice: 3299,
            totalPrice: 3299,
          },
        ],
      },
    },
    update: {},
  });

  // Order 2: POS-0004
  const ord2 = await prisma.order.upsert({
    where: { orderNumber: "POS-0004" },
    create: {
      orderNumber: "POS-0004",
      customerId: customerWalkin.id,
      customerName: "Walk-in Retail Customer",
      customerEmail: "walkin@store.local",
      customerPhone: "+91 98200 12345",
      shippingAddress: "Local Store Counter Pickup, MIDC Andheri East",
      totalAmount: 7999,
      status: "Confirmed",
      notes: "Channel: POS",
      items: {
        create: [
          {
            productVariantId: varCam2.id,
            sku: "MS-DIYC180",
            name: "Micawas DIY Smart Camera 1080P",
            quantity: 1,
            unitPrice: 7999,
            totalPrice: 7999,
          },
        ],
      },
    },
    update: {},
  });

  // Order 3: POS-0005
  const ord3 = await prisma.order.upsert({
    where: { orderNumber: "POS-0005" },
    create: {
      orderNumber: "POS-0005",
      customerId: customerWalkin.id,
      customerName: "Walk-in Retail Customer",
      customerEmail: "walkin@store.local",
      customerPhone: "+91 98200 12345",
      shippingAddress: "Local Store Counter Pickup, MIDC Andheri East",
      totalAmount: 4999,
      status: "Confirmed",
      notes: "Channel: POS",
      items: {
        create: [
          {
            productVariantId: varCam1.id,
            sku: "MS-6W5188",
            name: "Micawas Pro 4K WiFi Outdoor Security Camera",
            quantity: 1,
            unitPrice: 4999,
            totalPrice: 4999,
          },
        ],
      },
    },
    update: {},
  });

  // Order 4: ORD-0003
  const ord4 = await prisma.order.upsert({
    where: { orderNumber: "ORD-0003" },
    create: {
      orderNumber: "ORD-0003",
      customerId: customerWalkin.id,
      customerName: "Walk-in Retail Customer",
      customerEmail: "walkin@store.local",
      customerPhone: "+91 98200 12345",
      shippingAddress: "Local Store Counter Pickup, MIDC Andheri East",
      totalAmount: 2499,
      status: "Delivered",
      notes: "Channel: POS",
      items: {
        create: [
          {
            productVariantId: varTshirt.id,
            sku: "TSHIRT-BLK-M",
            name: "Black T-Shirt - M",
            quantity: 1,
            unitPrice: 2499,
            totalPrice: 2499,
          },
        ],
      },
    },
    update: {},
  });

  // Invoices for local orders
  await prisma.invoice.upsert({
    where: { invoiceNumber: "INV-0001" },
    create: {
      invoiceNumber: "INV-0001",
      orderId: ord1.id,
      customerId: customerPooja.id,
      subtotal: 2795.76,
      gstRate: 18,
      cgst: 251.62,
      sgst: 251.62,
      grandTotal: 3299,
    },
    update: {},
  });

  await prisma.invoice.upsert({
    where: { invoiceNumber: "INV-0004" },
    create: {
      invoiceNumber: "INV-0004",
      orderId: ord2.id,
      customerId: customerWalkin.id,
      subtotal: 6778.81,
      gstRate: 18,
      cgst: 610.09,
      sgst: 610.09,
      grandTotal: 7999,
    },
    update: {},
  });

  await prisma.invoice.upsert({
    where: { invoiceNumber: "INV-0003" },
    create: {
      invoiceNumber: "INV-0003",
      orderId: ord4.id,
      customerId: customerWalkin.id,
      subtotal: 2117.80,
      gstRate: 18,
      cgst: 190.60,
      sgst: 190.60,
      grandTotal: 2499,
    },
    update: {},
  });

  // 4. Marketplace Orders (Amazon & Flipkart)
  let amzCred = await prisma.marketplaceCredential.findFirst({ where: { channel: "AMAZON" } });
  if (!amzCred) {
    amzCred = await prisma.marketplaceCredential.create({
      data: {
        channel: "AMAZON",
        name: "Amazon India Store",
        isActive: true,
        sandbox: true,
      },
    });
  }

  let fkCred = await prisma.marketplaceCredential.findFirst({ where: { channel: "FLIPKART" } });
  if (!fkCred) {
    fkCred = await prisma.marketplaceCredential.create({
      data: {
        channel: "FLIPKART",
        name: "Flipkart Seller Hub",
        isActive: true,
        sandbox: true,
      },
    });
  }

  // Amazon Order
  await prisma.marketplaceOrder.upsert({
    where: { channelOrderId: "404-2226818-8852871" },
    create: {
      credentialId: amzCred.id,
      channel: "AMAZON",
      channelOrderId: "404-2226818-8852871",
      buyerName: "Rajesh Kumar",
      buyerCity: "New Delhi",
      buyerState: "Delhi",
      buyerPincode: "110001",
      shippingAddress: "House 24, Block C, Connaught Place, New Delhi - 110001",
      totalAmount: 2499,
      orderStatus: "UNSHIPPED",
      fulfillmentChannel: "MERCHANT",
      trackingNumber: "ATS-9872149182",
      courier: "Amazon ATS Logistics",
      items: {
        create: [
          {
            channelSku: "TSHIRT-BLK-M",
            asinOrFsn: "B09ARC1234",
            title: "Black T-Shirt - M",
            quantity: 1,
            itemPrice: 2499,
            localVariantId: varTshirt.id,
          },
        ],
      },
    },
    update: {},
  });

  // Flipkart Order
  await prisma.marketplaceOrder.upsert({
    where: { channelOrderId: "OD5444532242454526" },
    create: {
      credentialId: fkCred.id,
      channel: "FLIPKART",
      channelOrderId: "OD5444532242454526",
      buyerName: "Ananya Iyer",
      buyerCity: "Bengaluru",
      buyerState: "Karnataka",
      buyerPincode: "560034",
      shippingAddress: "Flat 304, Palm Grove Heights, Koramangala 4th Block, Bengaluru - 560034",
      totalAmount: 1899,
      orderStatus: "UNSHIPPED",
      fulfillmentChannel: "MERCHANT",
      trackingNumber: "FMPC-448102941",
      courier: "Flipkart Ekart Logistics",
      items: {
        create: [
          {
            channelSku: "TSHIRT-BLK-M",
            asinOrFsn: "FSNC4M993022",
            title: "Black T-Shirt - M",
            quantity: 1,
            itemPrice: 1899,
            localVariantId: varTshirt.id,
          },
        ],
      },
    },
    update: {},
  });

  console.log("✅ Demo orders, marketplace orders, and invoices restored successfully!");
}

main()
  .catch((e) => {
    console.error("Error restoring demo data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
