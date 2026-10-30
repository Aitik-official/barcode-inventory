# Complete Project Specification, Feature Blueprint & Implementation Guide
## Enterprise Serialized Barcode Inventory, Multi-Channel Fulfillment & Ledger Management System

> **Version:** 2.4.0  
> **Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Prisma ORM (MongoDB / PostgreSQL compatible), Tailwind CSS, Lucide Icons, Browser Session Storage Engine.  
> **Purpose:** Comprehensive architecture, data schemas, API routes, UX workflows, and edge-case handling for replicating or integrating this enterprise barcode inventory system into another project.

---

## Table of Contents
1. [System Architecture & Design Philosophy](#1-system-architecture--design-philosophy)
2. [Data Schema & Entity Relationship Model](#2-data-schema--entity-relationship-model)
3. [Core Feature Modules & Implementation Specifications](#3-core-feature-modules--implementation-specifications)
   - [3.1 Serialized Unit Barcode & Thermal Labeling Engine](#31-serialized-unit-barcode--thermal-labeling-engine)
   - [3.2 Barcode Deletion & Defective Piece Shifting](#32-barcode-deletion--defective-piece-shifting)
   - [3.3 Multi-Channel Order Hub & Interactive Returns Lifecycle](#33-multi-channel-order-hub--interactive-returns-lifecycle)
   - [3.4 Inventory Warehouse Balances & Double-Entry Stock Ledger](#34-inventory-warehouse-balances--double-entry-stock-ledger)
   - [3.5 Damaged & Waste Write-off Audit System](#35-damaged--waste-write-off-audit-system)
   - [3.6 Marketplace SP-API & Flipkart Integration Hub](#36-marketplace-sp-api--flipkart-integration-hub)
   - [3.7 GST Tax Invoices & 100x150mm Shipping Slips](#37-gst-tax-invoices--100x150mm-shipping-slips)
   - [3.8 Live Camera Barcode Scanning & POS Dispatch Verification](#38-live-camera-barcode-scanning--pos-dispatch-verification)
   - [3.9 Progressive Parallel Batch Fetching & Client Caching Engine](#39-progressive-parallel-batch-fetching--client-caching-engine)
4. [Complete API Endpoints Directory](#4-complete-api-endpoints-directory)
5. [Critical Edge Cases, Concurrency & Gotchas](#5-critical-edge-cases-concurrency--gotchas)
6. [Step-by-Step Blueprint to Replicate in a New Project](#6-step-by-step-blueprint-to-replicate-in-a-new-project)

---

## 1. System Architecture & Design Philosophy

The application is engineered around **Hybrid Serialized Inventory**:
- Traditional inventory tracks only aggregate counts (e.g., "10 blue shirts").
- This system tracks **both aggregate physical stock AND individual serialized unit barcodes** (`UnitBarcode`) for every single piece in the warehouse.
- Each physical piece possesses a unique serial number, barcode (EAN-13, Code-128, or custom prefix), operational lifecycle status (`AVAILABLE`, `SOLD`, `RESERVED`, `DAMAGED`, `RETIRED`), and audit trail.

### Architecture Highlights
```
[Client Browser]
   ├── Session Cache Layer (sessionStorage with instant rehydration)
   ├── Progressive Batch Fetcher (2 parallel batches of 20 items)
   └── Interactive UI Components (Optimistic updates & confirmation modals)
          │
          ▼ HTTP JSON (RESTful API / Next.js Server Actions)
[Next.js 16 App Router Edge/Node Runtime]
   ├── API Route Handlers (/api/orders, /api/barcodes, /api/inventory, /api/marketplaces)
   ├── Atomic Prisma Transactions ($transaction)
   └── Audit Logging Subsystem (writeAudit & InventoryTransaction)
          │
          ▼
[Database (Prisma ORM)]
   ├── UnitBarcode Registry (per-unit state machine)
   ├── Inventory & Stock Ledger (physical quantity vs available serialized units)
   ├── Waste & Write-off Ledger (defective units with defect notes)
   └── Multi-Channel Orders (Website, Amazon, Flipkart, POS)
```

---

## 2. Data Schema & Entity Relationship Model

Below is the complete, production-verified Prisma schema (`schema.prisma`):

```prisma
datasource db {
  provider = "mongodb" // Can also be postgresql or mysql
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ==========================================
// 1. PRODUCT CATALOG & SERIALIZED BARCODES
// ==========================================

model Category {
  id          String    @id @default(cuid()) @map("_id")
  name        String    @unique
  description String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  products    Product[]
}

model Product {
  id            String           @id @default(cuid()) @map("_id")
  name          String
  description   String?
  categoryId    String
  category      Category         @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  basePrice     Float            @default(0)
  gstRate       Float            @default(18)
  hsnCode       String?
  imageUrl      String?
  images        String[]         @default([])
  barcodePrefix String?          // Prefix used for unit generation e.g. "PRD"
  showOnWebsite Boolean          @default(true)
  isFeatured    Boolean          @default(false)
  variants      ProductVariant[]
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt
}

model ProductVariant {
  id                    String                 @id @default(cuid()) @map("_id")
  productId             String
  product               Product                @relation(fields: [productId], references: [id], onDelete: Cascade)
  sku                   String                 @unique
  name                  String                 // e.g. "Standard Roll - 50x25mm"
  price                 Float
  mrp                   Float?
  attributes            Json?                  // Key-value attributes: { size: "50x25", color: "White" }
  inventory             Inventory?
  unitBarcodes          UnitBarcode[]
  orderItems            OrderItem[]
  marketplaceMappings   MarketplaceMapping[]
  wastes                Waste[]
  inventoryTransactions InventoryTransaction[]
  customerStocks        CustomerStock[]
  printJobs             PrintJob[]
  createdAt             DateTime               @default(now())
  updatedAt             DateTime               @updatedAt
}

model UnitBarcode {
  id                    String                 @id @default(cuid()) @map("_id")
  productVariantId      String
  productVariant        ProductVariant         @relation(fields: [productVariantId], references: [id], onDelete: Cascade)
  barcode               String                 @unique
  serialNumber          Int                    // 1, 2, 3... per product sequence
  batchNumber           String?
  status                String                 @default("AVAILABLE") // AVAILABLE | SOLD | RESERVED | DAMAGED | RETIRED
  reason                String?                // Defect reason or return note
  printedAt             DateTime?
  soldAt                DateTime?
  orderItems            OrderItem[]
  inventoryTransactions InventoryTransaction[]
  createdAt             DateTime               @default(now())
  updatedAt             DateTime               @updatedAt

  @@index([productVariantId])
  @@index([status])
  @@index([barcode])
}

// ==========================================
// 2. INVENTORY BALANCES & STOCK LEDGER
// ==========================================

model Inventory {
  id               String         @id @default(cuid()) @map("_id")
  productVariantId String         @unique
  productVariant   ProductVariant @relation(fields: [productVariantId], references: [id], onDelete: Cascade)
  warehouse        String         @default("MAIN")
  quantity         Int            @default(0) // Available sellable units
  reservedQuantity Int            @default(0)
  updatedAt        DateTime       @updatedAt
}

model InventoryTransaction {
  id               String          @id @default(cuid()) @map("_id")
  productVariantId String
  productVariant   ProductVariant  @relation(fields: [productVariantId], references: [id], onDelete: Cascade)
  unitBarcodeId    String?
  unitBarcode      UnitBarcode?    @relation(fields: [unitBarcodeId], references: [id], onDelete: NoAction)
  transactionType  String          // RECEIVE | SALE | RETURN | ADJUST | DAMAGE | TRANSFER
  quantity         Int             // Positive for additions, negative for deductions
  previousStock    Int
  newStock         Int
  referenceType    String?         // ORDER | ORDER_RETURN | MANUAL_RETURN | PO | WRITE_OFF
  referenceId      String?
  note             String?
  performedBy      String          @default("system")
  createdAt        DateTime        @default(now())

  @@index([productVariantId])
  @@index([createdAt])
}

model Waste {
  id               String         @id @default(cuid()) @map("_id")
  productVariantId String
  productVariant   ProductVariant @relation(fields: [productVariantId], references: [id], onDelete: Cascade)
  supplierId       String?
  supplier         Supplier?      @relation(fields: [supplierId], references: [id], onDelete: NoAction)
  quantity         Int
  reason           String         // DAMAGED | EXPIRED | LOST | OTHER
  description      String?
  recordedBy       String         @default("system")
  createdAt        DateTime       @default(now())

  @@index([productVariantId])
}

// ==========================================
// 3. ORDERS & MULTI-CHANNEL FULFILLMENT
// ==========================================

model Order {
  id              String      @id @default(cuid()) @map("_id")
  orderNumber     String      @unique
  customerId      String?
  customer        Customer?   @relation(fields: [customerId], references: [id], onDelete: NoAction)
  customerName    String
  customerEmail   String
  customerPhone   String?
  company         String?
  gstin           String?
  shippingAddress String?
  totalAmount     Float       @default(0)
  status          String      @default("Order Placed") // Order Placed | Unshipped | Confirmed | Processing | Shipped | Delivered | Cancelled | Returned
  notes           String?
  items           OrderItem[]
  invoices        Invoice[]
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

model OrderItem {
  id               String          @id @default(cuid()) @map("_id")
  orderId          String
  order            Order           @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productVariantId String?
  productVariant   ProductVariant? @relation(fields: [productVariantId], references: [id], onDelete: NoAction)
  unitBarcodeId    String?
  unitBarcode      UnitBarcode?    @relation(fields: [unitBarcodeId], references: [id], onDelete: NoAction)
  sku              String
  name             String
  quantity         Int             @default(1)
  unitPrice        Float
  totalPrice       Float
}

model MarketplaceCredential {
  id             String                 @id @default(cuid()) @map("_id")
  channel        String                 // "AMAZON" | "FLIPKART"
  accountName    String
  sellerId       String?
  marketplaceId  String?
  appId          String?
  appSecret      String?
  refreshToken   String?
  accessToken    String?
  isActive       Boolean                @default(true)
  autoSyncStock  Boolean                @default(true)
  autoSyncOrders Boolean                @default(true)
  mappings       MarketplaceMapping[]
  orders         MarketplaceOrder[]
  createdAt      DateTime               @default(now())
  updatedAt      DateTime               @updatedAt
}

model MarketplaceMapping {
  id               String                @id @default(cuid()) @map("_id")
  credentialId     String
  credential       MarketplaceCredential @relation(fields: [credentialId], references: [id], onDelete: Cascade)
  productVariantId String
  channel          String                // "AMAZON" | "FLIPKART"
  channelSku       String
  externalId       String?               // ASIN or FSN
  title            String?
  listingPrice     Float                 @default(0)
  channelStock     Int                   @default(0)
  fulfillmentType  String                @default("FBM")
  syncStatus       String                @default("SYNCED")
  createdAt        DateTime              @default(now())
  updatedAt        DateTime              @updatedAt
}

model MarketplaceOrder {
  id                 String                 @id @default(cuid()) @map("_id")
  credentialId       String?
  credential         MarketplaceCredential? @relation(fields: [credentialId], references: [id], onDelete: SetNull)
  channel            String                 // "AMAZON" | "FLIPKART"
  channelOrderId     String                 @unique
  orderDate          DateTime               @default(now())
  orderStatus        String                 // PENDING | UNSHIPPED | SHIPPED | DELIVERED | CANCELLED | Returned
  buyerName          String?
  buyerCity          String?
  buyerState         String?
  buyerPincode       String?
  shippingAddress    String?
  totalAmount        Float                  @default(0)
  trackingNumber     String?
  courier            String?
  items              MarketplaceOrderItem[]
  createdAt          DateTime               @default(now())
  updatedAt          DateTime               @updatedAt
}

model MarketplaceOrderItem {
  id                 String           @id @default(cuid()) @map("_id")
  marketplaceOrderId String
  marketplaceOrder   MarketplaceOrder @relation(fields: [marketplaceOrderId], references: [id], onDelete: Cascade)
  channelSku         String
  asinOrFsn          String?
  title              String
  quantity           Int              @default(1)
  itemPrice          Float            @default(0)
  localVariantId     String?
  scannedBarcode     String?
}

// ==========================================
// 4. PARTNERS, INVOICING & SETTINGS
// ==========================================

model Customer {
  id             String          @id @default(cuid()) @map("_id")
  name           String
  username       String          @unique
  email          String          @unique
  phone          String?
  company        String?
  address        String?
  city           String?
  state          String?
  zip            String?
  gstin          String?
  orders         Order[]
  quotations     Quotation[]
  invoices       Invoice[]
  customerStocks CustomerStock[]
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
}

model Supplier {
  id             String          @id @default(cuid()) @map("_id")
  name           String          @unique
  contact        String?
  email          String?
  phone          String?
  address        String?
  city           String?
  state          String?
  pincode        String?
  gstin          String?
  purchaseOrders PurchaseOrder[]
  wastes         Waste[]
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
}

model PurchaseOrder {
  id          String              @id @default(cuid()) @map("_id")
  poNumber    String              @unique
  supplierId  String
  supplier    Supplier            @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  status      String              @default("PENDING") // PENDING | PARTIAL | RECEIVED | CANCELLED
  totalAmount Float               @default(0)
  items       PurchaseOrderItem[]
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
}

model PurchaseOrderItem {
  id              String        @id @default(cuid()) @map("_id")
  purchaseOrderId String
  purchaseOrder   PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  sku             String
  name            String
  quantity        Int
  receivedQty     Int           @default(0)
  unitPrice       Float
  totalPrice      Float
}

model Invoice {
  id            String    @id @default(cuid()) @map("_id")
  invoiceNumber String    @unique
  orderId       String?
  order         Order?    @relation(fields: [orderId], references: [id], onDelete: NoAction)
  customerId    String?
  customer      Customer? @relation(fields: [customerId], references: [id], onDelete: NoAction)
  subtotal      Float
  gstType       String    @default("CGST_SGST") // CGST_SGST | IGST
  gstRate       Float     @default(18)
  cgst          Float     @default(0)
  sgst          Float     @default(0)
  igst          Float     @default(0)
  grandTotal    Float
  createdAt     DateTime  @default(now())
}

model AuditLog {
  id        String   @id @default(cuid()) @map("_id")
  action    String
  entity    String
  entityId  String
  details   String?
  performedBy String @default("system")
  createdAt DateTime @default(now())
}

model CompanySettings {
  id            String   @id @default(cuid()) @map("_id")
  companyName   String   @default("My Enterprise")
  tradeName     String?
  gstin         String?
  email         String?
  phone         String?
  addressLine1  String?
  city          String?
  state         String?
  pincode       String?
  invoicePrefix String   @default("INV")
  updatedAt     DateTime @updatedAt
}
```

---

## 3. Core Feature Modules & Implementation Specifications

### 3.1 Serialized Unit Barcode & Thermal Labeling Engine

#### Concept
Rather than treating SKU items as a single commodity bucket, every unit gets a distinct serial number (e.g. `Unit #1`, `Unit #2`...) and a machine-readable barcode:
- Format: `[PREFIX]-[VARIANT_SKU_FRAGMENT]-[TIMESTAMP/SEQUENCE]` or standard EAN-13/Code-128.
- Serial sequence: Guaranteed contiguous integer serial counter per product variant.

#### Lifecycle State Machine
```
[GENERATE] ───> AVAILABLE ───[FULFILL ORDER]───> SOLD
                   │                               │
                   ├──[SHIFT TO DEFECTIVE]──> DAMAGED <──[RETURN AS DEFECTIVE]
                   │                             │
                   └──[RESTORE/REPAIR] <─────────┘
```

#### Thermal Print Engine
- Supports standard **50x25mm**, **50x50mm**, and **100x150mm** thermal label printers (Zebra, TSC, Citizen, TVS).
- Uses CSS `@media print` rules with zero page margins, exact pixel sizing, and barcode canvas rendering.

---

### 3.2 Barcode Deletion & Defective Piece Shifting

Implemented in `src/app/(barcode)/barcodes/UnitBarcodesClient.tsx` and `src/app/api/barcodes/route.ts`:

#### Shifting to Defective Piece (`status = "DAMAGED"`)
1. User clicks the amber **"Defective"** button in `/barcodes`.
2. A modal captures the reason:
   - *Damaged in transit / handling*
   - *Manufacturing flaw / hardware failure*
   - *Customer return defective*
   - *Cosmetic scratch / cracked screen*
3. **Backend Operations (`PATCH /api/barcodes`):**
   - Updates `UnitBarcode.status = "DAMAGED"`, `UnitBarcode.reason = [Selected Reason]`.
   - Recounts `AVAILABLE` unit barcodes for that variant.
   - Updates `Inventory.quantity` to match the active available count (decrementing sellable inventory by 1).
   - Inserts record into `Waste` table (`reason: "DAMAGED"`, `quantity: 1`).
   - Creates an `InventoryTransaction` with `transactionType: "DAMAGE"`, `quantity: -1`.
4. **Restore to Available Action:**
   - If a defective unit is repaired or marked defective by mistake, a green **"Restore"** button calls `PATCH /api/barcodes` with `status: "AVAILABLE"`, re-incrementing available inventory and clearing the defect flag.

#### Deleting a Unit Barcode (`DELETE /api/barcodes?id=...`)
1. Permanent deletion modal asks for confirmation, showing unit serial number and variant name.
2. If the unit was in `AVAILABLE` status, warehouse inventory quantity is automatically decremented by 1 to maintain physical alignment.
3. Unit record is deleted from `UnitBarcode`.

---

### 3.3 Multi-Channel Order Hub & Interactive Returns Lifecycle

Implemented in `src/app/(barcode)/orders/OrdersClient.tsx` and `src/app/api/orders/route.ts`:

#### Interactive Return Workflow
When an operator sets order status to **"Returned"**:
1. The status selector **intercepts** the change and launches the **"Process Order Return"** modal.
2. Displays the order's line items and attached serialized barcodes.
3. Asks the core operator decision:
   - **Restock to Available Stock (Good Condition / Resellable):**
     * Barcode updated to `AVAILABLE`.
     * Available inventory quantity incremented (+quantity).
     * `InventoryTransaction` recorded with `transactionType: "RETURN"`.
   - **Shift to Defective Pieces (Damaged / Waste):**
     * Barcode updated to `DAMAGED` with defect note.
     * Available inventory is **NOT** incremented (stays deducted).
     * `Waste` audit record created.
     * `InventoryTransaction` recorded with `transactionType: "DAMAGE"`.
4. Order status updated to `Returned`, and return disposition appended to order notes.

---

### 3.4 Inventory Warehouse Balances & Double-Entry Stock Ledger

Implemented in `src/app/(barcode)/inventory/InventoryClient.tsx`:

#### Real-time Stock Balance Formula
For any product variant:
$$\text{Sellable Available Quantity} = \text{Count}(\text{UnitBarcode where } \text{status} = \text{'AVAILABLE'})$$

#### Double-Entry Transaction Ledger (`InventoryTransaction`)
Every stock movement records:
- `transactionType`: `RECEIVE` | `SALE` | `RETURN` | `DAMAGE` | `ADJUST` | `TRANSFER`
- `quantity`: Signed integer (+/-)
- `previousStock`: Stock before action
- `newStock`: Resulting stock
- `referenceType` & `referenceId`: Links to Order #, PO #, or Return batch
- `performedBy`: Operator ID or `admin`

---

### 3.5 Damaged & Waste Write-off Audit System

Implemented in `src/app/(barcode)/inventory/InventoryClient.tsx` and `src/app/api/inventory/returns/route.ts`:

- Tab: **"Write-offs (Damaged & Waste)"** in `/inventory`.
- Dedicated **"Process Return / Defect"** modal allows intake directly from the warehouse without an order number:
  - Input mode: `RESTOCK` or `DEFECTIVE`
  - Variant selector + optional Barcode scan
  - Automatic ledger and stock synchronization.

---

### 3.6 Marketplace SP-API & Flipkart Integration Hub

Implemented in `src/app/(barcode)/marketplaces/` and `src/app/api/marketplaces/`:

- **Channels:** Amazon SP-API (India `A21TJRUUN4KGV`), Flipkart API.
- **SKU Mapping:** Maps internal `ProductVariant.sku` to Amazon `channelSku` / `ASIN` and Flipkart `FSN`.
- **Auto Stock Push:** When warehouse quantity changes, webhook/sync triggers Amazon `listingsItems` / `fbaInventory` feeds to keep external stock synchronized and prevent out-of-stock overselling.

---

### 3.7 GST Tax Invoices & 100x150mm Shipping Slips

Implemented in `src/components/PrintShippingInvoiceDialog.tsx`:

#### Modes
1. **Full A4 GST Tax Invoice:**
   - Buyer & Consignee details, GSTIN, State code.
   - HSN codes, Taxable value, CGST (9%), SGST (9%), or IGST (18%) computation.
   - Bank details, Authorized signature block, Terms & conditions.
2. **100x150mm (4x6 Inch) Thermal Shipping Label:**
   - High-contrast carrier header (Delhivery, BlueDart, DTDC, India Post).
   - Machine-scannable Order & Tracking Barcodes (Code-128).
   - Sender address, Consignee shipping address, weight, dimensions, and prepaid/COD indicator.

---

### 3.8 Live Camera Barcode Scanning & POS Dispatch Verification

Implemented in `src/app/(barcode)/scan/`:

- Uses HTML5 Video Stream + Barcode Detector API (`ZXing` / native `BarcodeDetector`).
- **Dispatch Verification Mode:** Operator scans the package shipping slip, then scans the item unit barcode. If the barcode matches the order items, it emits an audible chime and advances order to `SHIPPED`. If a mismatch occurs, it shows a red warning modal.

---

### 3.9 Progressive Parallel Batch Fetching & Client Caching Engine

Implemented in `src/lib/progressiveBatchFetch.ts` and `src/lib/sessionCache.ts`:

#### How Zero-Lag Tab Switching Works
1. **Browser Session Storage (`sessionStorage`):**
   - Each module caches its data under keys (`orders_hub_list`, `inventory_stock_list`, `barcodes_registry_list`).
   - When switching tabs, state is initialized **synchronously** from memory cache. The UI renders instantly with **0ms wait time**.
2. **Progressive 2-Parallel Batch Fetcher:**
   - On initial mount or background refresh, it queries in concurrent pairs:
     - Batch 1: Pages 2 and 3 concurrently (e.g. 20 items each).
     - Merges into client state and cache.
     - Batch 2: Pages 4 and 5 concurrently.
     - Continues until `hasMore === false`.
   - Never blocks user interactions.

---

## 4. Complete API Endpoints Directory

| Method | Endpoint | Description | Payload / Query Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/orders` | Fetch paginated orders & marketplace orders | `?page=1&limit=20&search=...&status=...` |
| `PATCH` | `/api/orders` | Update order status, tracking, return disposition | `{ orderId, status, returnType, returnReason, courier, trackingNumber }` |
| `POST` | `/api/orders` | Create new POS / Direct Order | `{ lines: [{ variantId, quantity }] }` |
| `DELETE` | `/api/orders` | Delete orders & restore barcodes/inventory | `?id=...` or `{ ids: [...] }` |
| `GET` | `/api/barcodes` | Fetch paginated unit barcodes with status filters | `?page=1&limit=20&search=...&status=AVAILABLE` |
| `PATCH` | `/api/barcodes` | Update barcode status (e.g. `DAMAGED`, `AVAILABLE`) | `{ id, status, reason }` |
| `DELETE` | `/api/barcodes` | Delete unit barcode and sync stock | `?id=...` or `{ ids: [...] }` |
| `POST` | `/api/barcodes/generate` | Generate serial unit series for a variant | `{ productVariantId, count, prefix }` |
| `GET` | `/api/inventory` | List warehouse balances & variants | None |
| `POST` | `/api/inventory` | Adjust stock balance & create ledger log | `{ variantId, quantity, type, note }` |
| `POST` | `/api/inventory/returns` | Record return or shift to defective piece | `{ productVariantId, type, quantity, barcode, reason, description }` |
| `POST` | `/api/inventory/waste` | Record damaged write-off in Waste ledger | `{ productVariantId, quantity, reason, description }` |
| `POST` | `/api/inventory/po` | Create supplier Purchase Order | `{ supplierId, totalAmount, notes }` |
| `GET` | `/api/products` | Fetch paginated product catalog | `?page=1&limit=20&search=...` |
| `POST` | `/api/products` | Create product with variants | `{ name, categoryId, basePrice, variants: [...] }` |
| `GET` | `/api/scan/verify` | Look up barcode for fulfillment verification | `?barcode=...` |
| `POST` | `/api/marketplaces/push-inventory` | Push live stock level to Amazon/Flipkart | `{ productVariantId }` |
| `POST` | `/api/settings/company` | Save company profile & invoice settings | `CompanySettingsData` payload |

---

## 5. Critical Edge Cases, Concurrency & Gotchas

### 1. Serialized vs Non-Serialized Stock Count Synchronization
- **Gotcha:** If a user manually edits `Inventory.quantity = 15` via a quick adjustment, but only 10 `UnitBarcode` records exist with `status = "AVAILABLE"`, physical scanning will fail on the 11th item.
- **Rule:** For any product variant with unit barcodes, `Inventory.quantity` must always be derived from:
  `prisma.unitBarcode.count({ where: { productVariantId, status: "AVAILABLE" } })`.

### 2. Defective Piece Double Deduction Prevention
- **Edge Case:** An item is sold (`status = "SOLD"`). Later, customer returns it as defective.
- **Correct Flow:**
  - Status changes from `SOLD` to `DAMAGED`.
  - Available inventory was already deducted at the time of sale.
  - Therefore, marking the return as defective **must NOT decrement available inventory a second time**; it merely records the write-off in `Waste` and leaves sellable inventory un-replenished.

### 3. Restock Return Duplicate Barcode Prevention
- **Edge Case:** When restocked, ensure the unit barcode's `soldAt` timestamp is reset to `null` and `status` returns to `AVAILABLE`.

### 4. Marketplace Concurrency & Out-of-Stock Overselling
- When inventory drops to 0 in the warehouse, immediately invoke `POST /api/marketplaces/push-inventory` to update Amazon & Flipkart listing stocks to 0 to prevent marketplace penalties.

### 5. Next.js 16 Worker Concurrency on Windows
- **Issue:** On multi-core Windows machines, Next.js 16 build spawns up to 11 concurrent workers causing `FATAL ERROR: NewSpace::EnsureCurrentCapacity Allocation failed - JavaScript heap out of memory`.
- **Solution:** Add `experimental: { cpus: 4 }` into `next.config.ts`.

---

## 6. Step-by-Step Blueprint to Replicate in a New Project

### Step 1: Install Dependencies
```bash
npm install @prisma/client lucide-react clsx tailwind-merge zod
npm install -D prisma typescript @types/node @types/react
```

### Step 2: Configure Database & Generate Client
1. Place the Prisma schema in `prisma/schema.prisma`.
2. Add your database connection string in `.env`:
   ```env
   DATABASE_URL="mongodb+srv://... or postgresql://..."
   ```
3. Run:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

### Step 3: Implement Core Utilities
- Copy `src/lib/prisma.ts` for database client singleton.
- Copy `src/lib/sessionCache.ts` for browser session caching.
- Copy `src/lib/progressiveBatchFetch.ts` for parallel batch fetching.
- Copy `src/lib/audit.ts` for automated audit trails.

### Step 4: Implement API Handlers
- Copy `src/app/api/barcodes/route.ts` & `generate/route.ts`.
- Copy `src/app/api/orders/route.ts`.
- Copy `src/app/api/inventory/returns/route.ts` & `waste/route.ts`.

### Step 5: Implement UI Views
- Copy `src/app/(barcode)/barcodes/UnitBarcodesClient.tsx` (registry, defective modal, delete modal).
- Copy `src/app/(barcode)/orders/OrdersClient.tsx` (unified orders, interactive return modal).
- Copy `src/app/(barcode)/inventory/InventoryClient.tsx` (stock ledger, waste ledger, return intake modal).
- Copy `src/components/PrintShippingInvoiceDialog.tsx` (thermal labels & A4 invoices).

---
*Document produced as official project blueprint. Ready for standalone implementation.*
