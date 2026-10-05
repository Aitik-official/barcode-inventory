# Adminzaa — Complete Feature List

Handoff document for rebuilding this application. It covers every working feature from the public website (customer) through the admin dashboard (operations).

**What the product is:** a B2B marketplace for office products and services (printing, stationery, and related supplies). Customers browse, buy products, and enquire about services. Admins manage the catalog, customers, warehouse inventory, orders, quotations, invoices, and reports.

**Stack used today:** Next.js (App Router), React, MongoDB (Mongoose), Cloudinary (images), Excel (xlsx) for bulk upload and reports, PDF invoices.

---

## 1. Roles

| Role | How they enter | What they can do |
| --- | --- | --- |
| Guest | Public site, no login | Browse home, categories, products, services, static pages. Search. Open product/service pages. |
| Customer | Register or login from the header | Cart, checkout, orders, quotations, enquiries, profile, stock-in-hand. Blocked customers cannot log in. |
| Admin | `/dashboard` login (fixed admin credentials, 24-hour session in the browser) | Full operations dashboard: catalog, customers, inventory, orders, reports. |

The live admin app is `/dashboard`. `/admin` and `/vendor-dashboard` exist as older/demo screens and are not the working operations console.

---

## 2. Customer website — end to end

### 2.1 Header (every public page)

- Logo links to home.
- Search box: search products, services, or vendors.
- Category menu loaded from the database (3 levels: category → sub-category → level 2). Clicking a level opens the matching listing.
- Links: About Us, Contact Us.
- Account menu: login, register, My Account, logout.
- Cart icon with item count and a cart dropdown.
- Mobile hamburger menu with the same links.

### 2.2 Home page (`/`)

- Hero banner slider under the sticky header.
- Explore Categories: image cards for categories. Image comes from the category record (Cloudinary). Click opens that category.
- Marketing sections: Why Choose Us, How it Works (browse → order → delivery), testimonials / trust content.
- Footer on every public page.

### 2.3 Browse catalog

**Products** (`/products`)

- List active products.
- Filter by category, sub-category, and level-2 category (also via URL query).
- Search by name.
- Sort (by name and related options).
- Card shows image, name, price.
- Card opens the product at a clean URL: `/{product-name-slug}` (example: `/demo`).

**Services** (`/services`)

- Same browsing pattern as products.
- Card opens `/{service-name-slug}` (example: `/letter-head-printing`).

**Categories**

- `/categories` and `/allcategories` list categories.
- `/categories/...` shows products or services inside that category path.
- Category type is either **product** or **service**. That decides which listing the user lands on.

**Product detail** (`/{slug}`, also old `/product/{id}` and `/p/{slug}` redirect to the clean slug)

- Breadcrumb.
- Left: image gallery (multiple images, previous/next). On desktop the image **stays fixed** while the right column scrolls.
- Right: name, category, MRP / offer price / GST / final price, stock, description, HSN/HSL code, vendor.
- **Add to Cart** (quantity).
- Related browsing back to products.

**Service detail** (`/{slug}`, also old `/service/{id}` and `/s/{slug}` redirect to the clean slug)

- Left: cover image, sticky on desktop while the right side scrolls.
- Right: badge, category, title, star rating and review count, duration, service area, **Place Enquiry** button.
- About this service (long description).
- Feature list.
- Contact strip.
- No add-to-cart. Services are enquiry-only.

### 2.4 Enquiry (`/enquiry`)

Opened from a service (or contact). Customer must be logged in.

Fields and behavior:

- Linked item (product, service, or general contact), item name, message.
- Name, company, phone, email.
- Preferred contact: email, phone, or WhatsApp.
- Status starts as **pending**.
- Admin later sees it under Dashboard → Orders → Enquiries.

### 2.5 Cart (`/cart`)

- Line items: image, name, unit price, quantity (+/−), line total, remove.
- Cart total.
- Empty-cart state.
- Continue shopping, proceed to checkout.
- Cart is kept for the logged-in session (header count stays in sync).

### 2.6 Checkout (`/checkout`)

- Requires a non-empty cart and a logged-in customer.
- Shipping / billing fields: receiver name, company, phone, street, city, state, zip, country, GST number, order notes.
- Order summary with totals.
- Place order creates an order with status **Order Placed** and an order number `ORD-0001`, `ORD-0002`, …
- Success goes to order confirmation.

### 2.7 Order confirmation (`/order-confirmation`)

- Shows the new order number and a short confirmation.
- Links back to home or My Orders.

### 2.8 My Account (`/my-accounts`)

Logged-in customer area. Sidebar:

| Section | What the customer sees and can do |
| --- | --- |
| Profile | Name, username, email, phone, address, city, state, zip, country, GST. Update profile. Logout. |
| Orders | Their orders: order number, date, items, amount, status (Order Placed, Confirmed, Processing, Shipped, Delivered, Cancelled). |
| Quotations | Quotations sent to them. Open a quotation to accept, reject, or request a re-quote with a message. |
| Enquiries | Enquiries they submitted and the status (pending, viewed, responded, closed). |
| Stock in Hand | Products the admin has allocated to this customer (quantity, price, notes). This is warehouse stock sitting with the customer, not the public cart. |

Logout returns them to the public site.

### 2.9 Quotation response (`/user-quotation`)

When the customer opens a quotation they can:

- Read items, quantities, prices, total, company, GST, notes, quotation number (`QUO-0001`, …).
- **Accept** — marks `userResponse = accepted`.
- **Reject** — marks `userResponse = rejected`.
- **Request re-quote** — sends a message; status becomes `requested re-quote`.

Admin acceptance of a quotation (from the dashboard) creates a real order.

### 2.10 Invoice view (`/invoice`)

- Printable / downloadable PDF invoice.
- Customer details, invoice number (`INV-…`), date, line items (name, HSN, qty, price, total).
- GST as CGST+SGST or IGST, rate, extra charges, grand total.
- Linked order number when the invoice came from an order.

### 2.11 Static pages

| Page | Purpose |
| --- | --- |
| `/about` | Company story |
| `/contact` | Contact details / contact enquiry |
| `/privacy` | Privacy policy |
| `/terms` | Terms of use |
| `/faq` | Frequently asked questions |
| `/support` | Support information |
| `/vendors` | Vendor listing page |

### 2.12 Footer

- About, Categories, Vendors, Contact, Cart, Checkout.
- Privacy, Terms, Support, FAQ.
- Credit link.

---

## 3. Customer account rules

Registration (`/api/auth/register`):

- Name, unique username, unique email, phone, password.
- Address, city, state, zip, country (default India), GST number.
- Status starts **active**.

Login (`/api/auth/login`):

- Username + password.
- If status is **blocked**, login is refused with a “contact support” message.
- Session is stored for the customer on the site.

Customers are created by self-registration **or** by an admin in the dashboard.

---

## 4. Admin dashboard — end to end

URL: `/dashboard`  
Gate: admin username and password. Session lasts 24 hours, then they must log in again. Logout is in the header.

Layout:

- Left sidebar, fixed. On mobile it is a slide-over menu.
- Only one sidebar group stays open at a time (accordion).
- Main area scrolls. Header has Refresh (on the home dashboard) and Logout.

### 4.1 Dashboard home

Summary cards:

- Total products
- Total services
- Total revenue
- Total orders

Also:

- Recent activity (latest orders with order number and time).
- Top categories (share of products + services).
- Refresh reloads these numbers.

### 4.2 Products Management

#### Categories

- Create, edit, delete a category.
- Fields: name (unique), main use (**product** or **service**), description, image (upload to Cloudinary; the form shows the file name).
- These categories drive the home “Explore Categories” cards and the header menu.

#### Sub Categories

- Create, edit, delete.
- Fields: name, parent main category, main use (product or service), description.

#### Level 2 Sub Categories

- Create, edit, delete.
- Fields: name, main category, sub-category, main use, description.
- This is the third level of the public menu.

#### Products

- List with search and category filter, pagination.
- Create / edit / delete a product.
- Fields:
  - Name, category, sub-category, level-2 category
  - MRP, offer price, GST %, stock
  - Discount and final price are calculated (discount = MRP − offer price; final price = offer price + GST)
  - Description, HSN/HSL code, vendor
  - Status: Active, Inactive, Out of Stock
  - Featured flag, tags
  - One or more images (Cloudinary)
- **Download Template** and **Upload Excel** for bulk create/update.
- Public site only treats Active products as sellable. URL is the slug of the name.

#### Services

- List with search and category filter, pagination.
- Create / edit / delete a service.
- Fields:
  - Name, category, sub-category, level-2 category
  - Price, duration, location (service area)
  - Description, vendor
  - Status: Active or Inactive
  - Rating, features list, requirements list
  - Images (Cloudinary)
- **Download Template** and **Upload Excel** for bulk create/update.
- Public page is enquiry-only. URL is the slug of the name.

### 4.3 Customer Management

#### Stock with Customer

This is stock the company has placed with a customer (eshop / consignment stock), not the public shopping cart.

- See each customer’s allocated products: name, quantity, price, notes, last updated.
- Add products to a customer.
- Edit quantity, price, and notes.
- Remove a product from a customer.
- **Re-top up:** add more quantity on top of what they already hold. Each top-up is stored in retop-up history (previous qty, added qty, new qty, price, notes, date).
- Can record whether stock came **from warehouse** or **direct from supplier**.

The same stock appears on the customer’s My Account → Stock in Hand.

#### Block / Unblock Customer

- Paginated customer list.
- Block a customer (they cannot log in).
- Unblock a customer.

#### Edit Customer Details

- Paginated list.
- Edit name, username, email, phone, password, address, city, state, zip, country, GST number.
- See total orders and total spent.

#### Supplier Management

- Create, edit, deactivate suppliers.
- Fields: name (unique), contact, email, phone, address, city, state, pincode, GST number, notes, active flag.
- Suppliers are used on purchase orders, inward receipts, and supplier reports.

### 4.4 Inventory Management

Stock flow in plain language:

1. Admin creates a **Purchase Order** to a supplier.
2. Goods are **Inwarded** (received) against that PO, or as a direct inward with no PO.
3. A **GRN** (goods receipt note) confirms receipt into a warehouse location.
4. **Warehouse Stock** increases.
5. **Outward** moves stock from the warehouse to a customer (their Stock in Hand).
6. **Waste** reduces warehouse stock for damaged, expired, lost, or other reasons.

#### Purchase Orders

- Create a PO.
- Fields: supplier, line items (product, quantity, unit price), total, expected date, notes.
- Delivery type: **to warehouse** or **direct to customer** (customer required for direct).
- PO type: standard or reference.
- PO number is unique.
- Status flow: PO Created → Partially Received → Closed. Also reference / cancelled style states (pending, received, reached, cancelled) where used.
- Received quantity and pending quantity update as goods come in.
- PO can be linked to later GRNs.

#### Inward

- Record goods received.
- Types: **linked to a PO** or **direct inward** (no PO).
- Fields: supplier, received date, items (ordered qty, received qty, accepted qty, rejected qty), warehouse.
- Generate a GRN from an inward entry.
- Inward number is unique.

#### GRN (goods receipt)

- Types: GRN created from an inward/PO, or direct GRN.
- Fields: supplier, warehouse (default Main Warehouse), location (zone, rack, bin), items and accepted quantities.
- Posting a GRN increases warehouse stock.
- GRN number is unique.

#### Warehouse Stock

- One row per product (and warehouse): available quantity, last received date, last supplier, total received, location (zone / rack / bin), batch/GRN reference.
- This is the source quantity before outward or waste.

#### Outwards

- Send stock from a warehouse to a customer.
- Fields: product, customer, quantity, warehouse, unit price, total, notes.
- Decreases warehouse stock and increases that customer’s Stock in Hand.
- Paginated list.

#### Waste Management

- Write off stock.
- Fields: product, supplier, quantity, warehouse, reason (**damaged**, **expired**, **lost**, **other**), description, date, recorded by.
- Decreases warehouse stock.
- Shows up in Supplier Reports when filtered to waste.

### 4.5 Orders

#### All Orders

- Every customer order: order number `ORD-xxxx`, customer email, phone, company, GST, items, quantities, prices, total, shipping address, notes, date.
- Change status: **Order Placed → Confirmed → Processing → Shipped → Delivered**, or **Cancelled**.
- View full order.
- **Generate Invoice** from an order:
  - Copies customer and line items.
  - Admin sets GST type (CGST/SGST or IGST), GST rate, and optional extra charges.
  - Saves an invoice `INV-…` linked to the order.
  - Invoice can be opened as PDF.

Address text in the list is truncated so long addresses do not break the row. Status and actions stay on one line.

#### Quotations

- List of quotations (`QUO-xxxx`) with search and pagination.
- View and edit items, prices, total, notes, status.
- Delete a quotation.
- **Accept quotation:** creates a real order (status Order Placed) from the quotation and jumps to All Orders.
- Customer accept / reject / re-quote responses are visible here.
- Admin can also **create a quotation from an enquiry** (Send Quotation).

#### Enquiries

- List of customer enquiries.
- See item (product, service, or contact), message, phone, preferred contact method, company, date.
- Status: **pending → viewed → responded → closed**.
- Admin can add response notes.
- **Send Quotation** turns the enquiry into a quotation for that customer.

### 4.6 Reports

#### Invoice Reports

- Filters: date range and customer. At least one filter is required before export.
- Table of matching invoices: invoice no, customer, date, subtotal, CGST, SGST, extra charges, grand total, item count, total quantity.
- **Export to Excel**.
- Pagination, 5 rows per page.
- Month-style revenue totals are available for the dashboard figures.

#### Supplier Reports

- Filters: date range, supplier, and type (**all**, **purchase only**, **waste only**).
- Purchase lines come from received purchase / inward activity.
- Waste lines come from waste entries.
- **Export to Excel**.
- Pagination, 5 rows per page.

---

## 5. Number series

| Document | Format | When it is created |
| --- | --- | --- |
| Order | `ORD-0001` | Customer checkout, or admin accepts a quotation |
| Quotation | `QUO-0001` | Admin sends a quotation (often from an enquiry) |
| Invoice | `INV-…` | Admin generates an invoice from an order |
| Purchase order | Unique PO number | Admin creates a PO |
| Inward | Unique inward number | Admin records a receipt |
| GRN | Unique GRN number | Admin posts a goods receipt |

Numbers go up by 1 and do not reuse a used number.

---

## 6. Data the new app must store

| Record | Important fields |
| --- | --- |
| Category | name, main use (product/service), description, image |
| Sub-category | name, main category, main use, description |
| Level-2 category | name, main category, sub-category, main use, description |
| Product | name, 3-level category, MRP, offer price, GST %, discount, final price, stock, description, HSN, images, vendor, status, featured, tags |
| Service | name, 3-level category, price, duration, description, location, vendor, status, rating, images, features, requirements |
| Customer | name, username, email, phone, password, address, city, state, zip, country, GST, status active/blocked, totals |
| Supplier | name, contact, email, phone, address, city, state, pincode, GST, notes, active |
| Order | order no, user, items, total, status, shipping address, phone, company, GST, notes |
| Quotation | quotation no, user, items, total, status, user response (accepted / rejected / re-quote), re-quote message, notes |
| Enquiry | user, item type, item name, message, phone, contact method, status, response notes |
| Invoice | invoice no, customer snapshot, items + HSN, subtotal, GST type and rate, extra charges, grand total, linked order |
| Customer stock | product, customer, quantity, price, notes, invoiced quantity |
| Retop-up history | customer, products with previous / added / new qty, notes, date |
| Purchase order | PO number, supplier, items, total, delivery type, customer if direct, expected date, status, received and pending qty |
| Inward | inward number, PO link or direct, supplier, date, item quantities |
| GRN | GRN number, type, supplier, warehouse, location, items |
| Warehouse stock | product, warehouse, available qty, last receipt, location |
| Outward | product, customer, qty, warehouse, price |
| Waste | product, supplier, qty, reason, description, date |

Images are files uploaded to Cloudinary. The database stores the image URL.

---

## 7. Main user journeys (build these first)

**Customer buys a product**

1. Open home → category or search → product page.
2. Add to cart → checkout → enter address and GST → place order.
3. See confirmation. Track status under My Account → Orders.
4. Admin moves status and can generate an invoice. Customer can open the PDF.

**Customer asks about a service**

1. Open service page → Place Enquiry → write message and contact preference.
2. Enquiry appears in My Account and in the admin Enquiries list.
3. Admin sends a quotation.
4. Customer accepts, rejects, or asks for a re-quote.
5. If admin accepts the quotation, it becomes an order.

**Admin receives stock and gives it to a customer**

1. Create supplier (if new).
2. Create purchase order.
3. Inward the goods → generate GRN → warehouse stock goes up.
4. Outward to a customer → their Stock in Hand goes up.
5. Or mark damaged goods as waste → warehouse stock goes down.
6. Supplier report shows purchases and waste. Invoice report shows billed sales.

**Admin publishes the catalog**

1. Create category (product or service) and upload an image.
2. Add sub-category and level-2 category.
3. Add products or services one by one, or by Excel template.
4. They appear on the home category cards, the header menu, and the public listing. Detail URL is the name slug.

---

## 8. Public URL map

| URL | Screen |
| --- | --- |
| `/` | Home |
| `/products` | Product listing |
| `/services` | Service listing |
| `/categories` | Categories |
| `/{name-slug}` | Product, service, or category detail |
| `/enquiry` | Enquiry form |
| `/cart` | Cart |
| `/checkout` | Checkout |
| `/order-confirmation` | Order placed |
| `/my-accounts` | Customer account |
| `/user-quotation` | Quotation accept / reject / re-quote |
| `/invoice` | Invoice PDF |
| `/about` `/contact` `/faq` `/support` `/privacy` `/terms` `/vendors` | Static pages |
| `/dashboard` | Admin login + full dashboard |

Old `/product/...` and `/service/...` addresses should redirect to `/{name-slug}`.

---

## 9. Behavior details worth copying

- Desktop product and service pages: left image column is sticky; only the right details scroll.
- Header stays fixed. Banner sits directly under it (no large empty gap).
- Category cards: photo on top, title bar below, no text over the photo.
- Dashboard sidebar: one group open at a time; sidebar stays fixed while the page scrolls.
- Long order addresses truncate with a tooltip instead of overflowing the table.
- Excel: two separate actions, Download Template and Upload Excel (not one broken dropdown).
- Invoice and supplier reports: filter first, then export; 5 rows per page.
- Product price math: discount = MRP − offer price; final price = offer price plus GST on the offer price.
- Blocked customers cannot log in.
- Services are not added to the cart. Products are.
