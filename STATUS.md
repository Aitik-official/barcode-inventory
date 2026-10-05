# Barcode Inventory — Status

Simple Next.js (App Router) full-stack barcode + inventory MVP.

Run: `npm run db:setup` then `npm run dev` → http://localhost:3000

---

## Two apps (separate)

Use the switch at the top of every page.

| Switch | What it is | Start URL |
| --- | --- | --- |
| Barcode Inventory | Existing barcode, print, scan, stock app | `/` |
| Adminzaa | B2B catalog from COMPLETE-FEATURES.md | `/zaa` |

Adminzaa admin login: `admin` / `admin123` → `/zaa/dashboard`

Adminzaa stages: 1 catalog (done) → 2 categories & services → 3 cart & orders → 4 quotations & invoices → 5 warehouse → 6 connect barcodes. The databases are not linked yet.

## How to use

See **[HOW_TO_USE.md](./HOW_TO_USE.md)** or open **/guide** in the app.

---

## Done (MVP)

### Core
- [x] Next.js App Router UI + API routes in one project
- [x] SQLite + Prisma schema (products, variants, barcodes, inventory, transactions, print jobs, audit)
- [x] Demo seed product (Black T-Shirt M / barcode `2900010245`)
- [x] Approachable Home UI with 4 clear steps
- [x] In-app **How to use** page (`/guide`) + `HOW_TO_USE.md`

### Products & SKU
- [x] Create product + variant
- [x] Auto SKU (or custom)
- [x] Product list + search (name / SKU / barcode)
- [x] Product detail page

### Barcode engine
- [x] Internal Code 128 numeric barcodes
- [x] Uniqueness check (variant + history — retired codes not reused)
- [x] Idempotent generate (won’t create a second barcode if one exists)
- [x] Regenerate (retire old → new active + history)
- [x] Barcode history on product page
- [x] Bulk generate missing barcodes
- [x] Preview (JsBarcode SVG)

### Printing (with size selection)
- [x] Print dialog asks for **label size** before printing
- [x] Default size options matched to common thermal labels:
  - 50 × 25 mm — small apparel tag
  - **50 × 30 mm** — default standard retail
  - 75 × 50 mm — warehouse / shelf
  - 100 × 50 mm — carton / box
- [x] Copies quantity
- [x] Print preview window sized to selected mm
- [x] Reprint = **same barcode** (no new generation)
- [x] Print job logged + audit (`BARCODE_PRINTED` / `BARCODE_REPRINTED`)

### Scanner / POS
- [x] Scan field (USB scanner keyboard wedge or type + Enter)
- [x] Lookup API
- [x] Cart — same barcode increases qty
- [x] Complete sale → stock decrease + inventory transaction

### Inventory
- [x] Stock on create (optional initial stock)
- [x] Receive / damage adjust on product page
- [x] Inventory transactions list
- [x] Dashboard counts (barcoded, missing, printed, stock)

### Screens
- [x] Dashboard
- [x] Products / Add / Detail
- [x] Scan / POS
- [x] Missing barcodes

---

## Remaining (not in this MVP)

### Printing / hardware
- [ ] Local print agent for direct USB Zebra/TSC (ZPL/TSPL) — browser print only today
- [ ] Network printer queue integration
- [ ] Bulk print UI (multi-product print all with per-row qty)
- [ ] Visual label designer (drag fields / custom templates)

### Product / catalog
- [ ] Multiple variants UI per product (create many colors/sizes in one flow)
- [ ] Categories / brands as master tables
- [ ] Soft delete / deactivate product flows with UI
- [ ] Official GS1 / EAN / UPC fields (manual assign only — never fake)

### Inventory
- [ ] Multi-warehouse stock per location
- [ ] Stock transfer between warehouses
- [ ] Purchase orders / returns full workflow
- [ ] Reserved quantity usage in orders

### Auth & security
- [ ] Login / users
- [ ] Roles (Super Admin, Manager, Billing, Viewer) + permission matrix
- [ ] Protected regenerate / delete

### Ops / reporting
- [ ] Full audit log UI
- [ ] Advanced reports / export CSV
- [ ] Marketplace mapping (Amazon / Flipkart / Meesho IDs)

### Quality
- [ ] Automated tests (duplicate barcode, concurrent generate, stock edge cases)
- [ ] PostgreSQL for production (SQLite is for local/dev)

---

## Important business rules already enforced

1. One active variant → one unique internal barcode  
2. Reprint never generates a new barcode  
3. Stock changes create inventory transactions  
4. SKU and barcode are separate fields  
5. Retired barcodes are not silently reused  
6. Generate is idempotent if barcode already exists  

---

## How print size works

When you click **Print label** or **Reprint label**:

1. Dialog opens  
2. You pick a **label size** suitable for the labels loaded in the printer  
3. You set **copies**  
4. System records the print job (same barcode)  
5. Browser print window opens with page size = selected mm  

Match the dropdown to the physical label roll in your thermal printer (e.g. if the printer has 50×30 mm labels, choose **50 × 30 mm**).
