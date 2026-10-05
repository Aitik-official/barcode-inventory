/**
 * Amazon SP-API (Selling Partner API) Integration Client
 * Handles LWA (Login with Amazon) OAuth token exchange, Orders API, and Listings/Inventory Feeds.
 */

export interface AmazonCredentials {
  sellerId?: string | null;
  marketplaceId?: string | null;
  appId?: string | null; // LWA Client ID
  appSecret?: string | null; // LWA Client Secret
  refreshToken?: string | null; // LWA Refresh Token
  accessToken?: string | null;
  tokenExpiresAt?: Date | null;
  sandbox?: boolean;
}

export interface AmazonOrderPayload {
  AmazonOrderId: string;
  PurchaseDate: string;
  LastUpdateDate?: string;
  OrderStatus: "Pending" | "Unshipped" | "PartiallyShipped" | "Shipped" | "Canceled" | "Unfulfillable";
  FulfillmentChannel: "MFN" | "AFN"; // MFN = Merchant (FBM), AFN = Amazon (FBA)
  OrderTotal?: {
    CurrencyCode: string;
    Amount: string;
  };
  BuyerInfo?: {
    BuyerName?: string;
    BuyerEmail?: string;
  };
  ShippingAddress?: {
    Name?: string;
    AddressLine1?: string;
    AddressLine2?: string;
    City?: string;
    StateOrRegion?: string;
    PostalCode?: string;
    CountryCode?: string;
  };
  OrderItems?: Array<{
    OrderItemId: string;
    SellerSKU: string;
    ASIN: string;
    Title: string;
    QuantityOrdered: number;
    QuantityShipped?: number;
    ItemPrice?: {
      CurrencyCode: string;
      Amount: string;
    };
    ItemTax?: {
      CurrencyCode: string;
      Amount: string;
    };
  }>;
}

/**
 * Get access token from Login with Amazon (LWA)
 */
export async function getAmazonLwaToken(credentials: AmazonCredentials): Promise<{ accessToken: string; expiresIn: number }> {
  if (!credentials.appId || !credentials.appSecret || !credentials.refreshToken) {
    throw new Error("Missing Amazon LWA credentials (appId, appSecret, refreshToken required)");
  }

  // In Sandbox / Test Mock Mode
  if (credentials.appId.startsWith("mock_") || credentials.refreshToken.startsWith("mock_")) {
    return {
      accessToken: "Atza|mock_access_token_" + Date.now(),
      expiresIn: 3600,
    };
  }

  const response = await fetch("https://api.amazon.com/auth/o2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: credentials.refreshToken,
      client_id: credentials.appId,
      client_secret: credentials.appSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Amazon LWA Token Exchange Failed: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Fetch Orders from Amazon SP-API Orders v0 endpoint
 */
export async function fetchAmazonOrdersFromSpApi(
  credentials: AmazonCredentials,
  createdAfter?: Date
): Promise<AmazonOrderPayload[]> {
  const marketplaceId = credentials.marketplaceId || "A21TJRUUN4KGV"; // Amazon India default

  // If mock/sandbox without live credentials, return mock simulated orders
  if (!credentials.appId || credentials.appId.startsWith("mock_") || credentials.sandbox) {
    return getSimulatedAmazonOrders();
  }

  const tokenData = await getAmazonLwaToken(credentials);
  const host = "https://sellingpartnerapi-eu.amazon.com"; // EU/India Region
  const afterIso = createdAfter ? createdAfter.toISOString() : new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const url = `${host}/orders/v0/orders?MarketplaceIds=${marketplaceId}&CreatedAfter=${encodeURIComponent(afterIso)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-amz-access-token": tokenData.accessToken,
      "Content-Type": "application/json",
      "User-Agent": "BarcodeZaaInventory/1.0 (Language=NodeJS)",
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Amazon SP-API Orders Request Failed: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return (data.payload?.Orders || []) as AmazonOrderPayload[];
}

/**
 * Push Inventory Stock to Amazon SP-API Listings Items API
 */
export async function pushAmazonInventoryStock(
  credentials: AmazonCredentials,
  sellerSku: string,
  quantity: number
): Promise<{ success: boolean; message: string }> {
  if (!credentials.sellerId || !credentials.appId || credentials.appId.startsWith("mock_") || credentials.sandbox) {
    return {
      success: true,
      message: `[Simulated] Amazon SP-API inventory for SKU '${sellerSku}' successfully updated to ${quantity} units.`,
    };
  }

  const tokenData = await getAmazonLwaToken(credentials);
  const marketplaceId = credentials.marketplaceId || "A21TJRUUN4KGV";
  const host = "https://sellingpartnerapi-eu.amazon.com";
  const url = `${host}/listings/2021-08-01/items/${encodeURIComponent(credentials.sellerId)}/${encodeURIComponent(sellerSku)}?marketplaceIds=${marketplaceId}&issueLocale=en_IN`;

  const payload = {
    productType: "PRODUCT",
    patches: [
      {
        op: "replace",
        path: "/attributes/fulfillment_availability",
        value: [
          {
            fulfillment_channel_code: "DEFAULT",
            quantity: quantity,
          },
        ],
      },
    ],
  };

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "x-amz-access-token": tokenData.accessToken,
      "Content-Type": "application/json",
      "User-Agent": "BarcodeZaaInventory/1.0",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Amazon SP-API Inventory Push Failed: ${res.status} - ${err}`);
  }

  const data = await res.json();
  return {
    success: true,
    message: `Amazon SP-API stock updated: ${data.status || "ACCEPTED"}`,
  };
}

/**
 * High-quality simulated Amazon orders for testing & sandbox preview
 */
export function getSimulatedAmazonOrders(): AmazonOrderPayload[] {
  const now = new Date();
  return [
    {
      AmazonOrderId: `404-${Math.floor(1000000 + Math.random() * 9000000)}-${Math.floor(1000000 + Math.random() * 9000000)}`,
      PurchaseDate: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      OrderStatus: "Unshipped",
      FulfillmentChannel: "MFN",
      OrderTotal: {
        CurrencyCode: "INR",
        Amount: "2499.00",
      },
      BuyerInfo: {
        BuyerName: "Aarav Sharma",
        BuyerEmail: "aarav.sharma@amazonbuyer.in",
      },
      ShippingAddress: {
        Name: "Aarav Sharma",
        AddressLine1: "Flat 402, Lotus Towers, Andheri West",
        City: "Mumbai",
        StateOrRegion: "Maharashtra",
        PostalCode: "400053",
        CountryCode: "IN",
      },
      OrderItems: [
        {
          OrderItemId: "amz-item-001",
          SellerSKU: "MINI-CAM-1080P",
          ASIN: "B09ABC1234",
          Title: "Stealth Mini Spy Camera 1080p HD Night Vision",
          QuantityOrdered: 1,
          ItemPrice: {
            CurrencyCode: "INR",
            Amount: "2499.00",
          },
          ItemTax: {
            CurrencyCode: "INR",
            Amount: "449.82",
          },
        },
      ],
    },
    {
      AmazonOrderId: `402-${Math.floor(1000000 + Math.random() * 9000000)}-${Math.floor(1000000 + Math.random() * 9000000)}`,
      PurchaseDate: new Date(now.getTime() - 14 * 60 * 60 * 1000).toISOString(),
      OrderStatus: "Shipped",
      FulfillmentChannel: "MFN",
      OrderTotal: {
        CurrencyCode: "INR",
        Amount: "4990.00",
      },
      BuyerInfo: {
        BuyerName: "Pooja Verma",
        BuyerEmail: "pooja.v@amazonbuyer.in",
      },
      ShippingAddress: {
        Name: "Pooja Verma",
        AddressLine1: "Sector 14, Huda Complex",
        City: "Gurugram",
        StateOrRegion: "Haryana",
        PostalCode: "122001",
        CountryCode: "IN",
      },
      OrderItems: [
        {
          OrderItemId: "amz-item-002",
          SellerSKU: "PEN-CAM-4K",
          ASIN: "B09DEF5678",
          Title: "4K Executive Pen Camera with 64GB Memory Card",
          QuantityOrdered: 2,
          ItemPrice: {
            CurrencyCode: "INR",
            Amount: "4990.00",
          },
          ItemTax: {
            CurrencyCode: "INR",
            Amount: "898.20",
          },
        },
      ],
    },
  ];
}
