# Barcode Inventory System

Next.js full-stack barcode generation & inventory management (MVP).

## Quick start

```bash
npm install
npm run db:setup
npm run dev
```

Open http://localhost:3000

Demo product: **Black T-Shirt M** — barcode `2900010245` (use on Scan / POS).

## How to use (short)

1. **Add product** → barcode created  
2. **Print label** → pick size for your printer → print  
3. Stick label on item  
4. **Sell** → scan barcode → complete sale  

Full steps: [HOW_TO_USE.md](./HOW_TO_USE.md) or open **/guide** in the app.

## Features

- Create products with SKU + Code 128 barcode
- Preview / print / reprint labels
- **Print dialog asks for label size** (50×25, 50×30, 75×50, 100×50 mm)
- USB scanner–friendly POS cart
- Stock receive / sale / transactions
- Bulk generate missing barcodes
- Clear Home steps + How to use guide

See [STATUS.md](./STATUS.md) for **done vs remaining**.
