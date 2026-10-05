# How to use — Barcode Inventory

Simple steps for anyone using the app.

---

## 1. Start the app

```bash
npm install
npm run db:setup
npm run dev
```

Open **http://localhost:3000**

---

## 2. Main daily flow

```text
Add product  →  Print label (choose size)  →  Stick on item  →  Scan & sell
```

### Step 1 — Add product
1. Click **Add** (or Home → Start: Add product).
2. Enter name, color/size, sell price, stock.
3. Keep **Generate barcode automatically** checked.
4. Click **Save product & continue**.

### Step 2 — Print label
1. On the product page, click **Print label**.
2. Choose **label size** that matches labels in your printer:
   - 50 × 25 mm — small tag
   - **50 × 30 mm** — default retail
   - 75 × 50 mm — shelf
   - 100 × 50 mm — box
3. Set number of **copies**.
4. Click **Print**.
5. Stick labels on products.

> **Reprint** = same barcode again.  
> **Regenerate** = new barcode (old one retired). Use only when the code was wrong.

### Step 3 — Sell with scanner
1. Go to **Sell**.
2. Click the scan box.
3. Scan with USB scanner (or type barcode + Enter).
4. Same barcode again → quantity increases.
5. Click **Complete sale** → stock decreases.

---

## 3. Try the demo

Demo barcode already in the database:

```text
2900010245
```

Product: Black T-Shirt M (stock starts at 100).

Go to **Sell**, type that code, press Enter.

---

## 4. Other common tasks

| Need | Where |
|------|--------|
| Product has no barcode | **Fix barcodes** → Generate all missing |
| Receive more stock | Open product → enter qty → **Receive** |
| Wrong barcode on label | Product → **Regenerate** → print again |
| Don’t remember steps | Top nav → **How to use** |

---

## 5. Important rules (short)

1. One product variant = one active barcode.  
2. Reprint never creates a new barcode.  
3. SKU ≠ barcode (both are kept separate).  
4. Stock only changes via sales / receive / adjust (always logged).  

In the app, open **How to use** anytime for the same guide.
