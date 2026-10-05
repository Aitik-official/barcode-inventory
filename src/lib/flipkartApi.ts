/**
 * Flipkart Marketplace Seller API Integration Client
 * Handles Flipkart OAuth 2.0 Auth, Orders Search v3 API, and Listings Inventory Updates.
 */

export interface FlipkartCredentials {
  sellerId?: string | null;
  appId?: string | null; // Flipkart Application ID
  appSecret?: string | null; // Flipkart Application Secret
  accessToken?: string | null;
  tokenExpiresAt?: Date | null;
  sandbox?: boolean;
}

export interface FlipkartOrderPayload {
  orderId: string;
  orderDate: string;
  orderStatus: "APPROVED" | "PACKING_IN_PROGRESS" | "READY_TO_DISPATCH" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "RETURN_REQUESTED";
  fulfillmentType: "SELLER_SMART" | "NON_SMART" | "FLIPKART_ADVANTAGE";
  priceComponents: {
    totalPrice: number;
    customerPrice: number;
  };
  deliveryAddress: {
    name?: string;
    address1?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  orderItems: Array<{
    orderItemId: string;
    sku: string;
    fsn: string; // Flipkart Serial Number (FSN)
    title: string;
    quantity: number;
    price: number;
    taxRate?: number;
  }>;
}

/**
 * Get Flipkart OAuth 2.0 Access Token
 */
export async function getFlipkartToken(credentials: FlipkartCredentials): Promise<{ accessToken: string; expiresIn: number }> {
  if (!credentials.appId || !credentials.appSecret) {
    throw new Error("Missing Flipkart credentials (appId, appSecret required)");
  }

  // If mock/sandbox prefix
  if (credentials.appId.startsWith("mock_") || credentials.appSecret.startsWith("mock_")) {
    return {
      accessToken: "fk_oauth_token_" + Date.now(),
      expiresIn: 3600,
    };
  }

  const host = credentials.sandbox ? "https://sandbox-api.flipkart.net" : "https://api.flipkart.net";
  const authString = Buffer.from(`${credentials.appId}:${credentials.appSecret}`).toString("base64");

  const response = await fetch(`${host}/oauth-service/oauth/token?grant_type=client_credentials&scope=Seller_api`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${authString}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Flipkart OAuth Token Exchange Failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || 3600,
  };
}

/**
 * Fetch Orders from Flipkart Seller API v3
 */
export async function fetchFlipkartOrders(
  credentials: FlipkartCredentials,
  fromDate?: Date
): Promise<FlipkartOrderPayload[]> {
  // If mock/sandbox without live credentials, return mock simulated orders
  if (!credentials.appId || credentials.appId.startsWith("mock_") || credentials.sandbox) {
    return getSimulatedFlipkartOrders();
  }

  const tokenData = await getFlipkartToken(credentials);
  const host = credentials.sandbox ? "https://sandbox-api.flipkart.net" : "https://api.flipkart.net";
  const url = `${host}/sellers/v3/orders/search`;

  const afterIso = fromDate ? fromDate.toISOString() : new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const reqBody = {
    filter: {
      orderDate: {
        fromDate: afterIso,
        toDate: new Date().toISOString(),
      },
    },
    pagination: {
      pageSize: 50,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenData.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reqBody),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Flipkart Orders Fetch Failed: ${res.status} - ${err}`);
  }

  const data = await res.json();
  const ordersList: FlipkartOrderPayload[] = [];

  if (Array.isArray(data.orderItems)) {
    for (const item of data.orderItems) {
      ordersList.push({
        orderId: item.orderId || `OD${Math.floor(100000000000 + Math.random() * 900000000000)}`,
        orderDate: item.orderDate || new Date().toISOString(),
        orderStatus: item.status || "APPROVED",
        fulfillmentType: item.fulfillmentType || "SELLER_SMART",
        priceComponents: {
          totalPrice: item.priceComponents?.totalPrice || item.price || 0,
          customerPrice: item.priceComponents?.sellingPrice || item.price || 0,
        },
        deliveryAddress: {
          name: item.deliveryAddress?.name || "Flipkart Customer",
          city: item.deliveryAddress?.city || "Bangalore",
          state: item.deliveryAddress?.state || "Karnataka",
          pincode: item.deliveryAddress?.pincode || "560001",
        },
        orderItems: [
          {
            orderItemId: item.orderItemId || "fk-item-" + Math.floor(Math.random() * 1000),
            sku: item.sku || "SKU-DEFAULT",
            fsn: item.fsn || "FSN" + Math.floor(1000000 + Math.random() * 9000000),
            title: item.title || "Flipkart Marketplace Product",
            quantity: item.quantity || 1,
            price: item.price || 0,
          },
        ],
      });
    }
  }

  return ordersList;
}

/**
 * Update Flipkart Listings Inventory Stock
 */
export async function pushFlipkartInventoryStock(
  credentials: FlipkartCredentials,
  sku: string,
  quantity: number,
  fsn?: string
): Promise<{ success: boolean; message: string }> {
  if (!credentials.appId || credentials.appId.startsWith("mock_") || credentials.sandbox) {
    return {
      success: true,
      message: `[Simulated] Flipkart stock for SKU '${sku}' (FSN: ${fsn || "N/A"}) updated to ${quantity} units.`,
    };
  }

  const tokenData = await getFlipkartToken(credentials);
  const host = credentials.sandbox ? "https://sandbox-api.flipkart.net" : "https://api.flipkart.net";
  const url = `${host}/sellers/v3/listings/update`;

  const payload = {
    [sku]: {
      inventory: quantity,
      fulfillment_by: "seller",
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenData.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Flipkart Stock Push Failed: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return {
    success: true,
    message: `Flipkart stock update request submitted: ${JSON.stringify(data.status || "SUCCESS")}`,
  };
}

/**
 * High-quality simulated Flipkart orders for sandbox preview & testing
 */
export function getSimulatedFlipkartOrders(): FlipkartOrderPayload[] {
  const now = new Date();
  return [
    {
      orderId: `OD${Math.floor(1110000000000000 + Math.random() * 8880000000000000)}`,
      orderDate: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      orderStatus: "APPROVED",
      fulfillmentType: "SELLER_SMART",
      priceComponents: {
        totalPrice: 1899.0,
        customerPrice: 1899.0,
      },
      deliveryAddress: {
        name: "Vikram Malhotra",
        address1: "Plot 88, Jubilee Hills Road No. 36",
        city: "Hyderabad",
        state: "Telangana",
        pincode: "500033",
      },
      orderItems: [
        {
          orderItemId: "fkoi_7829104",
          sku: "MINI-CAM-1080P",
          fsn: "FSNCAM998822",
          title: "Stealth Mini Spy Camera 1080p Full HD Wireless DVR",
          quantity: 1,
          price: 1899.0,
        },
      ],
    },
    {
      orderId: `OD${Math.floor(1110000000000000 + Math.random() * 8880000000000000)}`,
      orderDate: new Date(now.getTime() - 22 * 60 * 60 * 1000).toISOString(),
      orderStatus: "SHIPPED",
      fulfillmentType: "SELLER_SMART",
      priceComponents: {
        totalPrice: 3200.0,
        customerPrice: 3200.0,
      },
      deliveryAddress: {
        name: "Neha Kulkarni",
        address1: "Flat 12B, Green Meadows, Baner",
        city: "Pune",
        state: "Maharashtra",
        pincode: "411045",
      },
      orderItems: [
        {
          orderItemId: "fkoi_9918231",
          sku: "CLOCK-CAM-WIFI",
          fsn: "FSNCLK334411",
          title: "WiFi Table Clock Spy Camera with Live Remote Streaming",
          quantity: 1,
          price: 3200.0,
        },
      ],
    },
  ];
}
