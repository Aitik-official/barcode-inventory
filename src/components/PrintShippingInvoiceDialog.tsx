"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Printer,
  X,
  FileText,
  CheckCircle2,
  SlidersHorizontal,
  Building2,
  Package,
  Layers,
  Sparkles,
  Eye,
  Download,
} from "lucide-react";

import { CompanySettingsData, DEFAULT_COMPANY_SETTINGS } from "@/lib/companySettingsTypes";

export interface ShippingInvoiceData {
  orderId: string;
  orderDbId?: string;
  isSavedInDb?: boolean;
  channel?: "AMAZON" | "FLIPKART" | "WEBSITE" | "DIRECT" | "POS";
  orderDate?: string | Date;
  invoiceNumber?: string;
  invoiceDate?: string | Date;
  buyerName: string;
  buyerEmail?: string;
  buyerPhone?: string;
  shippingAddress: string;
  city?: string;
  state?: string;
  pincode?: string;
  courier?: string;
  trackingNumber?: string;
  routingCode?: string;
  paymentMethod?: "PREPAID" | "COD";
  totalAmount: number;
  sellerName?: string;
  sellerGstin?: string;
  sellerAddress?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  items: Array<{
    title: string;
    sku: string;
    asinOrFsn?: string;
    unitBarcode?: string;
    hsn?: string;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    total: number;
  }>;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: ShippingInvoiceData;
  initialMode?: "A4_INVOICE" | "THERMAL_LABEL";
  companySettings?: CompanySettingsData;
  onInvoiceSaved?: (newInv: any) => void;
}

function numberToWords(num: number): string {
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const n = Math.floor(Math.abs(num));
  if (n === 0) return "Zero Rupees Only";

  function inWords(val: number): string {
    if (val < 20) return a[val];
    if (val < 100)
      return b[Math.floor(val / 10)] + (val % 10 !== 0 ? " " + a[val % 10] : "");
    if (val < 1000)
      return (
        a[Math.floor(val / 100)] +
        " Hundred" +
        (val % 100 !== 0 ? " " + inWords(val % 100) : "")
      );
    if (val < 100000)
      return (
        inWords(Math.floor(val / 1000)) +
        " Thousand" +
        (val % 1000 !== 0 ? " " + inWords(val % 1000) : "")
      );
    if (val < 10000000)
      return (
        inWords(Math.floor(val / 100000)) +
        " Lakh" +
        (val % 100000 !== 0 ? " " + inWords(val % 100000) : "")
      );
    return (
      inWords(Math.floor(val / 10000000)) +
      " Crore" +
      (val % 10000000 !== 0 ? " " + inWords(val % 10000000) : "")
    );
  }

  const intPart = inWords(n);
  const paise = Math.round((Math.abs(num) - n) * 100);
  if (paise > 0) {
    return `INR ${intPart} and ${inWords(paise)} Paise Only`;
  }
  return `INR ${intPart} Only`;
}

export function PrintShippingInvoiceDialog({
  isOpen,
  onClose,
  data,
  initialMode = "A4_INVOICE",
  companySettings,
  onInvoiceSaved,
}: Props) {
  const [docMode, setDocMode] = useState<"A4_INVOICE" | "THERMAL_LABEL">(
    initialMode
  );
  const [a4Layout, setA4Layout] = useState<"2_IN_1_DUAL" | "FULL_PAGE">("2_IN_1_DUAL");
  const [copies, setCopies] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [isSavedInDb, setIsSavedInDb] = useState(data.isSavedInDb || false);
  const [savingToDb, setSavingToDb] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedToast, setSettingsSavedToast] = useState(false);
  const [savedInvoiceNum, setSavedInvoiceNum] = useState(data.invoiceNumber || "");

  // Editable Seller Details (Auto-loaded from companySettings / API)
  const [sellerName, setSellerName] = useState(
    companySettings?.companyName || "Stealth Sight Inventory"
  );
  const [sellerTagline, setSellerTagline] = useState(
    companySettings?.tagline || "Professional Barcode, Thermal Labeling & Logistics"
  );
  const [sellerGstin, setSellerGstin] = useState(
    companySettings?.gstin || "27AABCU9603R1ZN"
  );
  const [sellerPan, setSellerPan] = useState(
    companySettings?.pan || "AABCU9603R"
  );
  const [sellerAddress, setSellerAddress] = useState(
    companySettings
      ? `${companySettings.addressLine1}${companySettings.addressLine2 ? ", " + companySettings.addressLine2 : ""}, ${companySettings.city}, ${companySettings.state} - ${companySettings.pincode}`
      : "Industrial Hub, Unit 4B, MIDC, Andheri East, Mumbai, MH - 400093"
  );
  const [sellerPhone, setSellerPhone] = useState(
    companySettings?.phone || "+91 98200 12345"
  );
  const [sellerEmail, setSellerEmail] = useState(
    companySettings?.email || "billing@stealthsight.com"
  );
  const [sellerWebsite, setSellerWebsite] = useState(
    companySettings?.website || "www.stealthsight.com"
  );
  const [sellerStateName, setSellerStateName] = useState(
    companySettings?.state ? `${companySettings.state} (${companySettings.stateCode || "27"})` : "Maharashtra (27)"
  );
  const [bankName, setBankName] = useState(
    companySettings?.bankName || "HDFC Bank"
  );
  const [bankAccount, setBankAccount] = useState(
    companySettings?.accountNumber || "50200012345678"
  );
  const [bankIfsc, setBankIfsc] = useState(
    companySettings?.ifscCode || "HDFC0001234"
  );
  const [bankBranch, setBankBranch] = useState(
    companySettings?.branch || "Andheri East, Mumbai"
  );
  const [bankUpi, setBankUpi] = useState(
    companySettings?.upiId || "stealthsight@hdfcbank"
  );
  const [showUpi, setShowUpi] = useState(
    companySettings?.showUpi ?? true
  );
  const [logoUrl, setLogoUrl] = useState(
    companySettings?.logoUrl || "/logo/1-01.png"
  );
  const [invoiceTerms, setInvoiceTerms] = useState(
    companySettings?.invoiceTerms ||
      "1. Goods once sold are covered under standard manufacturer warranty.\n2. Payment is due within agreed terms.\n3. Subject to Mumbai Jurisdiction."
  );
  const [signatoryName, setSignatoryName] = useState(
    companySettings?.authorizedSignatory || "Rushabh Gandhi"
  );
  const [signatoryDesignation, setSignatoryDesignation] = useState(
    companySettings?.signatoryDesignation || "Authorized Signatory"
  );

  useEffect(() => {
    setIsSavedInDb(data.isSavedInDb || false);
    if (data.invoiceNumber) setSavedInvoiceNum(data.invoiceNumber);
  }, [data.isSavedInDb, data.invoiceNumber]);

  useEffect(() => {
    if (companySettings) {
      setSellerName(companySettings.companyName || "Stealth Sight Inventory");
      setSellerTagline(companySettings.tagline || "");
      setSellerGstin(companySettings.gstin || "27AABCU9603R1ZN");
      setSellerPan(companySettings.pan || "AABCU9603R");
      setSellerAddress(
        `${companySettings.addressLine1 || ""}${companySettings.addressLine2 ? ", " + companySettings.addressLine2 : ""}, ${companySettings.city || ""}, ${companySettings.state || ""} - ${companySettings.pincode || ""}`
      );
      setSellerPhone(companySettings.phone || "+91 98200 12345");
      setSellerEmail(companySettings.email || "billing@stealthsight.com");
      setSellerWebsite(companySettings.website || "www.stealthsight.com");
      setSellerStateName(
        companySettings.state
          ? `${companySettings.state} (${companySettings.stateCode || "27"})`
          : "Maharashtra (27)"
      );
      setBankName(companySettings.bankName || "HDFC Bank");
      setBankAccount(companySettings.accountNumber || "50200012345678");
      setBankIfsc(companySettings.ifscCode || "HDFC0001234");
      setBankBranch(companySettings.branch || "MIDC Andheri East Branch, Mumbai");
      setBankUpi(companySettings.upiId || "");
      setShowUpi(companySettings.showUpi ?? true);
      setLogoUrl(companySettings.logoUrl || "/logo/1-01.png");
      setInvoiceTerms(
        companySettings.invoiceTerms ||
          "1. Goods once sold are covered under standard manufacturer warranty.\n2. Subject to Mumbai Jurisdiction."
      );
      setSignatoryName(companySettings.authorizedSignatory || "Rushabh Gandhi");
      setSignatoryDesignation(companySettings.signatoryDesignation || "Authorized Signatory");
    } else {
      // Fetch dynamic settings from API
      fetch("/api/settings/company")
        .then((res) => res.json())
        .then((cfg: CompanySettingsData) => {
          if (cfg) {
            setSellerName(cfg.companyName || "Stealth Sight Inventory");
            setSellerTagline(cfg.tagline || "");
            setSellerGstin(cfg.gstin || "27AABCU9603R1ZN");
            setSellerPan(cfg.pan || "AABCU9603R");
            setSellerAddress(
              `${cfg.addressLine1 || ""}${cfg.addressLine2 ? ", " + cfg.addressLine2 : ""}, ${cfg.city || ""}, ${cfg.state || ""} - ${cfg.pincode || ""}`
            );
            setSellerPhone(cfg.phone || "+91 98200 12345");
            setSellerEmail(cfg.email || "billing@stealthsight.com");
            setSellerWebsite(cfg.website || "www.stealthsight.com");
            setSellerStateName(
              cfg.state ? `${cfg.state} (${cfg.stateCode || "27"})` : "Maharashtra (27)"
            );
            setBankName(cfg.bankName || "HDFC Bank");
            setBankAccount(cfg.accountNumber || "50200012345678");
            setBankIfsc(cfg.ifscCode || "HDFC0001234");
            setBankBranch(cfg.branch || "Andheri East, Mumbai");
            setBankUpi(cfg.upiId || "");
            setShowUpi(cfg.showUpi ?? true);
            setLogoUrl(cfg.logoUrl || "/logo/1-01.png");
            setInvoiceTerms(
              cfg.invoiceTerms ||
                "1. Goods once sold are covered under standard manufacturer warranty.\n2. Subject to Mumbai Jurisdiction."
            );
            setSignatoryName(cfg.authorizedSignatory || "Rushabh Gandhi");
            setSignatoryDesignation(cfg.signatoryDesignation || "Authorized Signatory");
          }
        })
        .catch(() => {});
    }
  }, [companySettings]);

  const handleSaveCompanyDetails = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/settings/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: sellerName,
          tagline: sellerTagline,
          gstin: sellerGstin,
          pan: sellerPan,
          phone: sellerPhone,
          email: sellerEmail,
          website: sellerWebsite,
          bankName,
          accountNumber: bankAccount,
          ifscCode: bankIfsc,
          branch: bankBranch,
          upiId: bankUpi,
          showUpi,
          logoUrl,
          invoiceTerms,
          authorizedSignatory: signatoryName,
          signatoryDesignation,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save company details");
      }

      setSettingsSavedToast(true);
      setTimeout(() => setSettingsSavedToast(false), 4000);
    } catch (e: any) {
      alert(e.message || "Failed to save company settings");
    } finally {
      setSavingSettings(false);
    }
  };

  // Update mode if initialMode changes
  useEffect(() => {
    setDocMode(initialMode);
  }, [initialMode]);

  if (!isOpen) return null;

  // Sanitize items: ensure at least 1 row exists with proper numbers
  const displayItems =
    data.items && data.items.length > 0
      ? data.items
      : [
          {
            title: `Order Item (${data.orderId})`,
            sku: `SKU-${data.orderId.replace(/[^a-zA-Z0-9]/g, "") || "ITEM"}`,
            hsn: "8525",
            quantity: 1,
            unitPrice: data.totalAmount || 0,
            taxRate: 18,
            total: data.totalAmount || 0,
          },
        ];

  const subTotal = displayItems.reduce(
    (acc, item) => acc + (item.total || item.unitPrice * item.quantity),
    0
  );
  const grandTotal = data.totalAmount || subTotal;
  const taxableValue = Number((grandTotal / 1.18).toFixed(2));
  const totalGst = Number((grandTotal - taxableValue).toFixed(2));
  const cgst = Number((totalGst / 2).toFixed(2));
  const sgst = Number((totalGst / 2).toFixed(2));

  const isAmazon = data.channel === "AMAZON";
  const isFlipkart = data.channel === "FLIPKART";
  const tracking =
    data.trackingNumber ||
    `AWB-${data.orderId.replace(/[^0-9]/g, "").slice(-8) || "89230192"}`;
  const invoiceNum =
    data.invoiceNumber ||
    `INV-${new Date().getFullYear()}-${data.orderId.replace(/[^0-9]/g, "").slice(-4) || "0001"}`;
  const courierName =
    data.courier ||
    (isAmazon
      ? "Amazon ATS Express"
      : isFlipkart
      ? "Ekart Logistics"
      : "Standard Courier Logistics");
  const routing =
    data.routingCode ||
    (data.state
      ? `${data.state.slice(0, 3).toUpperCase()}/HUB-${
          data.pincode?.slice(0, 2) || "01"
        }`
      : "DEL/STD");

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=850,height=1100");
    if (!printWindow) {
      alert("Please allow popups to print invoices.");
      return;
    }

    if (docMode === "A4_INVOICE") {
      if (a4Layout === "2_IN_1_DUAL") {
        // DUAL COPY GENERATOR (2 Copies on 1 Single A4 Sheet: Top = Buyer, Bottom = Seller)
        const renderHalfCopyHtml = (
          copyBadge: string,
          copySubtext: string,
          isBuyer: boolean
        ) => {
          const itemsRows = displayItems
            .map((item, idx) => {
              const itemTotal =
                item.total || (item.unitPrice || 0) * (item.quantity || 1);
              const itemTaxable = (itemTotal / 1.18).toFixed(2);
              const itemCgst = ((itemTotal - Number(itemTaxable)) / 2).toFixed(2);
              const itemSgst = itemCgst;
              return `
                <tr>
                  <td style="padding: 2px 3px; text-align: center; border: 0.8px solid #0f172a; font-weight: 700; font-size: 7.5px;">${
                    idx + 1
                  }</td>
                  <td style="padding: 2px 3px; text-align: center; border: 0.8px solid #0f172a; font-family: monospace; font-size: 7.5px;">${
                    item.hsn || "8525"
                  }</td>
                  <td style="padding: 2px 3px; border: 0.8px solid #0f172a; font-family: monospace; font-size: 7.5px; font-weight: 700;">
                    ${item.sku}
                  </td>
                  <td style="padding: 2px 3px; border: 0.8px solid #0f172a;">
                    <div style="font-weight: 700; color: #0f172a; font-size: 8px; line-height: 1.15;">${
                      item.title
                    }</div>
                    ${
                      item.unitBarcode
                        ? `<div style="font-family: monospace; font-size: 7px; color: #475569;">Barcode: ${item.unitBarcode}</div>`
                        : ""
                    }
                  </td>
                  <td style="padding: 2px 3px; text-align: center; border: 0.8px solid #0f172a; font-weight: 800; font-size: 8px;">${
                    item.quantity
                  }</td>
                  <td style="padding: 2px 3px; text-align: right; border: 0.8px solid #0f172a; font-family: monospace; font-size: 7.5px;">₹${(
                    item.unitPrice / 1.18
                  ).toFixed(2)}</td>
                  <td style="padding: 2px 3px; text-align: right; border: 0.8px solid #0f172a; font-family: monospace; font-size: 7.5px;">₹${itemTaxable}</td>
                  <td style="padding: 2px 3px; text-align: right; border: 0.8px solid #0f172a; font-family: monospace; font-size: 7.5px;">₹${itemCgst}</td>
                  <td style="padding: 2px 3px; text-align: right; border: 0.8px solid #0f172a; font-family: monospace; font-size: 7.5px;">₹${itemSgst}</td>
                  <td style="padding: 2px 3px; text-align: right; border: 0.8px solid #0f172a; font-family: monospace; font-weight: 800; font-size: 8px; color: #0f172a;">₹${itemTotal.toFixed(
                    2
                  )}</td>
                </tr>
              `;
            })
            .join("");

          return `
            <div class="invoice-half-box">
              <!-- TOP 3-BOX HEADER -->
              <div style="display: grid; grid-template-columns: 1.2fr 1.15fr 0.95fr; border-bottom: 1px solid #0f172a;">
                <!-- BOX 1: SELLER DETAILS -->
                <div style="padding: 3px 5px; border-right: 1px solid #0f172a;">
                  ${
                    logoUrl
                      ? `<div style="margin-bottom: 2px;"><img src="${logoUrl}" alt="Logo" style="max-height: 18px; max-width: 80px; object-fit: contain; display: block;" onerror="this.style.display='none'" /></div>`
                      : ""
                  }
                  <div style="font-size: 11px; font-weight: 900; color: #0f172a; text-transform: uppercase; line-height: 1.1;">${sellerName}</div>
                  ${
                    sellerTagline
                      ? `<div style="font-size: 7px; font-weight: 700; color: #475569; line-height: 1;">${sellerTagline}</div>`
                      : ""
                  }
                  <div style="font-size: 7px; color: #334155; margin-top: 1.5px; line-height: 1.2;">
                    ${sellerAddress}
                  </div>
                  <div style="font-size: 7px; color: #334155;">
                    Tel: <strong>${sellerPhone}</strong> | Email: <strong>${sellerEmail}</strong>
                  </div>
                  <div style="font-size: 7px; font-weight: 800; color: #0f172a; margin-top: 1px;">
                    GSTIN: <span style="font-family: monospace;">${sellerGstin}</span> | State: <strong>${sellerStateName}</strong> | PAN: <span style="font-family: monospace;">${sellerPan}</span>
                  </div>
                </div>

                <!-- BOX 2: BUYER / CONSIGNEE (BILL & SHIP TO) -->
                <div style="padding: 3px 5px; border-right: 1px solid #0f172a; background: #fafbfc;">
                  <div style="font-size: 6.5px; font-weight: 800; color: #64748b; text-transform: uppercase; border-bottom: 0.5px solid #cbd5e1; padding-bottom: 1px; margin-bottom: 1.5px;">
                    BUYER / CONSIGNEE (BILL & SHIP TO):
                  </div>
                  <div style="font-size: 10px; font-weight: 900; color: #0f172a; text-transform: uppercase; line-height: 1.1;">
                    ${data.buyerName}
                  </div>
                  <div style="font-size: 7px; color: #334155; line-height: 1.2; margin-top: 1.5px;">
                    ${data.shippingAddress}${
            data.city ? `, ${data.city}, ${data.state || ""} - ${data.pincode || ""}` : ""
          }
                  </div>
                  <div style="font-size: 7px; color: #334155;">
                    ${
                      data.buyerPhone
                        ? `Contact: <strong>${data.buyerPhone}</strong> | `
                        : ""
                    }State: <strong>${data.state || "Maharashtra (27)"}</strong>
                  </div>
                  <div style="font-size: 7px; color: #0f172a; font-weight: 700; margin-top: 1px;">
                    Place of Supply: <strong>${
                      data.state || "Maharashtra (27)"
                    }</strong> | Reverse Charge: <strong>NO</strong>
                  </div>
                </div>

                <!-- BOX 3: INVOICE DETAILS & METADATA -->
                <div style="padding: 3px 5px; background: #fff;">
                  <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #0f172a; padding-bottom: 2px; margin-bottom: 2px;">
                    <span style="font-size: 9px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px;">TAX INVOICE</span>
                    <span style="font-size: 7px; font-weight: 800; padding: 1px 4px; background: ${
                      isBuyer ? "#0f172a" : "#475569"
                    }; color: #fff; border-radius: 2px; text-transform: uppercase;">
                      ${copySubtext}
                    </span>
                  </div>
                  <div style="font-size: 6.5px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 1.5px;">
                    ${copyBadge}
                  </div>
                  <div style="font-size: 7px; font-family: monospace; line-height: 1.35;">
                    <div><strong>INVOICE NO:</strong> <span style="font-weight: 800; color: #0f172a;">${invoiceNum}</span></div>
                    <div><strong>DATE:</strong> ${new Date(
                      data.invoiceDate || Date.now()
                    ).toLocaleDateString("en-IN")}</div>
                    <div><strong>ORDER REF:</strong> #${data.orderId}</div>
                    <div><strong>COURIER:</strong> ${courierName}</div>
                    <div><strong>AWB NO:</strong> <span style="font-weight: 700;">${tracking}</span></div>
                  </div>
                </div>
              </div>

              <!-- MAIN ITEMS TABLE: ERP HIGH DENSITY GRID -->
              <table style="width: 100%; border-collapse: collapse; font-size: 7.5px;">
                <thead>
                  <tr style="background: #f1f5f9; color: #0f172a; font-size: 7px; font-weight: 800; text-transform: uppercase;">
                    <th style="padding: 2.5px 3px; border: 0.8px solid #0f172a; width: 18px; text-align: center;">#</th>
                    <th style="padding: 2.5px 3px; border: 0.8px solid #0f172a; width: 35px; text-align: center;">HSN</th>
                    <th style="padding: 2.5px 3px; border: 0.8px solid #0f172a; width: 65px; text-align: left;">SKU / CODE</th>
                    <th style="padding: 2.5px 3px; border: 0.8px solid #0f172a; text-align: left;">PRODUCT DESCRIPTION & SPECIFICATIONS</th>
                    <th style="padding: 2.5px 3px; border: 0.8px solid #0f172a; width: 28px; text-align: center;">QTY</th>
                    <th style="padding: 2.5px 3px; border: 0.8px solid #0f172a; width: 45px; text-align: right;">RATE (₹)</th>
                    <th style="padding: 2.5px 3px; border: 0.8px solid #0f172a; width: 50px; text-align: right;">TAXABLE</th>
                    <th style="padding: 2.5px 3px; border: 0.8px solid #0f172a; width: 42px; text-align: right;">CGST (9%)</th>
                    <th style="padding: 2.5px 3px; border: 0.8px solid #0f172a; width: 42px; text-align: right;">SGST (9%)</th>
                    <th style="padding: 2.5px 3px; border: 0.8px solid #0f172a; width: 55px; text-align: right;">TOTAL (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows}
                </tbody>
                <tfoot>
                  <tr style="background: #f8fafc; font-weight: 800; font-size: 7.5px;">
                    <td colspan="4" style="padding: 2px 4px; border: 0.8px solid #0f172a; text-align: left;">
                      Totals: <strong>${displayItems.length} Item(s)</strong>
                    </td>
                    <td style="padding: 2px 3px; border: 0.8px solid #0f172a; text-align: center; font-weight: 900;">${displayItems.reduce(
                      (a, b) => a + b.quantity,
                      0
                    )}</td>
                    <td style="border: 0.8px solid #0f172a;"></td>
                    <td style="padding: 2px 3px; border: 0.8px solid #0f172a; text-align: right; font-family: monospace;">₹${taxableValue.toFixed(
                      2
                    )}</td>
                    <td style="padding: 2px 3px; border: 0.8px solid #0f172a; text-align: right; font-family: monospace;">₹${cgst.toFixed(
                      2
                    )}</td>
                    <td style="padding: 2px 3px; border: 0.8px solid #0f172a; text-align: right; font-family: monospace;">₹${sgst.toFixed(
                      2
                    )}</td>
                    <td style="padding: 2px 3px; border: 0.8px solid #0f172a; text-align: right; font-family: monospace; font-weight: 900; color: #0f172a;">₹${grandTotal.toFixed(
                      2
                    )}</td>
                  </tr>
                </tfoot>
              </table>

              <!-- BOTTOM 3-BOX SUMMARY & SETTLEMENT FOOTER -->
              <div style="display: grid; grid-template-columns: 1.35fr 0.9fr 0.95fr; border-top: 1px solid #0f172a;">
                <!-- COL 1: DECLARATION, WORDS, BANK & TERMS -->
                <div style="padding: 3px 5px; border-right: 1px solid #0f172a; font-size: 7px; line-height: 1.25;">
                  <div>
                    <strong style="color: #0f172a;">Declaration:</strong> I/We hereby certify that goods/products mentioned in this invoice are warranted to be genuine and of standard quality.
                  </div>
                  <div style="border-top: 0.5px dashed #94a3b8; margin-top: 1.5px; padding-top: 1.5px;">
                    <strong style="color: #0f172a;">Amount in Words:</strong> <span style="font-weight: 700;">${numberToWords(
                      grandTotal
                    )}</span>
                  </div>
                  <div style="border-top: 0.5px dashed #94a3b8; margin-top: 1.5px; padding-top: 1.5px; color: #334155;">
                    <strong>Settlement Bank:</strong> ${bankName} | <strong>A/C:</strong> <span style="font-family: monospace; font-weight: 700;">${bankAccount}</span> | <strong>IFSC:</strong> <span style="font-family: monospace; font-weight: 700;">${bankIfsc}</span>${
                      showUpi && bankUpi
                        ? ` | <strong>UPI:</strong> ${bankUpi}`
                        : ""
                    }
                  </div>
                  <div style="font-size: 6.5px; color: #64748b; margin-top: 1.5px;">
                    <strong>Terms:</strong> Standard manufacturer warranty applies. Subject to Mumbai Jurisdiction. E.&O.E.
                  </div>
                </div>

                <!-- COL 2: TAX VERIFICATION & DISPATCH -->
                <div style="padding: 3px 5px; border-right: 1px solid #0f172a; background: #fafbfc; font-size: 7px; line-height: 1.3;">
                  <div style="display: flex; justify-content: space-between;">
                    <span>Taxable Value:</span> <strong style="font-family: monospace;">₹${taxableValue.toFixed(2)}</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span>CGST (9%):</span> <span style="font-family: monospace;">₹${cgst.toFixed(2)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span>SGST (9%):</span> <span style="font-family: monospace;">₹${sgst.toFixed(2)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; border-top: 0.5px solid #cbd5e1; margin-top: 1.5px; padding-top: 1px; font-weight: 800;">
                    <span>Total GST:</span> <span style="font-family: monospace;">₹${totalGst.toFixed(2)}</span>
                  </div>
                  <div style="border-top: 0.5px solid #cbd5e1; margin-top: 2px; padding-top: 1.5px; font-size: 6.5px; color: #475569;">
                    Reverse Charge: <strong>NO</strong> | Mode: <strong>${data.paymentMethod || "PREPAID"}</strong><br/>
                    Packed by: <strong>Verified</strong> | Courier: <strong>${courierName}</strong>
                  </div>
                </div>

                <!-- COL 3: TOTALS & SIGNATURE -->
                <div style="padding: 3px 5px; font-size: 7.5px; line-height: 1.35; text-align: right;">
                  <div style="display: flex; justify-content: space-between; font-size: 7px;">
                    <span>Gross Taxable:</span> <span style="font-family: monospace;">₹${taxableValue.toFixed(2)}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 7px;">
                    <span>Add GST (18%):</span> <span style="font-family: monospace;">₹${totalGst.toFixed(2)}</span>
                  </div>
                  <div style="border: 1px solid #0f172a; background: #0f172a; color: #ffffff; padding: 2px 4px; border-radius: 2px; margin-top: 2px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 800; font-size: 7.5px; letter-spacing: 0.5px;">BILL AMT / TO PAY:</span>
                    <span style="font-family: monospace; font-weight: 900; font-size: 9.5px;">₹${grandTotal.toFixed(2)}</span>
                  </div>
                  <div style="margin-top: 4px; font-size: 7px;">
                    <div style="font-weight: 800; color: #0f172a;">For ${sellerName}</div>
                    <div style="margin-top: 8px; border-top: 0.8px solid #94a3b8; display: inline-block; padding-top: 1px; color: #475569; font-weight: 700;">
                      ${signatoryName} (${signatoryDesignation})
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `;
        };

        const pagesHtml = Array(copies)
          .fill(null)
          .map(
            () => `
          <div class="a4-page dual-layout">
            ${renderHalfCopyHtml(
              "ORIGINAL FOR RECIPIENT",
              "BUYER'S COPY",
              true
            )}

            <!-- SCISSOR CUT DIVIDER -->
            <div class="cut-divider">
              <span style="font-size: 11px;">✂</span>
              <span class="cut-text">CUT ALONG DOTTED LINE • TOP: BUYER COPY • BOTTOM: SELLER COPY</span>
              <span style="font-size: 11px;">✂</span>
            </div>

            ${renderHalfCopyHtml(
              "DUPLICATE FOR SUPPLIER",
              "SELLER'S COPY",
              false
            )}
          </div>
        `
          )
          .join("");

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Tax Invoice (2-in-1 Dual Copy) - ${invoiceNum} - ${data.orderId}</title>
              <style>
                @page {
                  size: A4 portrait;
                  margin: 4mm 5mm;
                }
                * {
                  box-sizing: border-box;
                  margin: 0;
                  padding: 0;
                }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
                  background: #fff;
                  color: #0f172a;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .a4-page {
                  width: 100%;
                  box-sizing: border-box;
                  page-break-after: always;
                  break-after: page;
                  display: flex;
                  flex-direction: column;
                  justify-content: space-between;
                  height: 289mm;
                  padding: 1mm 0;
                }
                .invoice-half-box {
                  border: 1.5px solid #0f172a;
                  border-radius: 2px;
                  background: #fff;
                  box-sizing: border-box;
                  height: 138mm;
                  display: flex;
                  flex-direction: column;
                  justify-content: space-between;
                }
                .cut-divider {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 8px;
                  margin: 1.5mm 0;
                  border-top: 1.5px dashed #0f172a;
                  padding-top: 1.5mm;
                  color: #0f172a;
                  font-size: 8px;
                  font-weight: 800;
                  letter-spacing: 1px;
                }
              </style>
            </head>
            <body>
              ${pagesHtml}
              <script>
                setTimeout(() => {
                  window.print();
                  window.close();
                }, 400);
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
        onClose();
        return;
      }

      // FULL PAGE A4 INVOICE (1 Copy - Full ERP layout)
      const itemsHtml = displayItems
        .map((item, idx) => {
          const itemTotal =
            item.total || (item.unitPrice || 0) * (item.quantity || 1);
          const itemTaxable = (itemTotal / 1.18).toFixed(2);
          const itemCgst = ((itemTotal - Number(itemTaxable)) / 2).toFixed(2);
          const itemSgst = itemCgst;
          return `
            <tr>
              <td style="padding: 4px 6px; text-align: center; border: 1px solid #0f172a; font-weight: 700; font-size: 10px;">${
                idx + 1
              }</td>
              <td style="padding: 4px 6px; text-align: center; border: 1px solid #0f172a; font-family: monospace; font-size: 10px;">${
                item.hsn || "8525"
              }</td>
              <td style="padding: 4px 6px; border: 1px solid #0f172a; font-family: monospace; font-size: 10px; font-weight: 700;">
                ${item.sku}
              </td>
              <td style="padding: 4px 6px; border: 1px solid #0f172a;">
                <div style="font-weight: 700; color: #0f172a; font-size: 11px; line-height: 1.2;">${
                  item.title
                }</div>
                ${
                  item.unitBarcode
                    ? `<div style="font-family: monospace; font-size: 9px; color: #475569;">Barcode: ${item.unitBarcode}</div>`
                    : ""
                }
              </td>
              <td style="padding: 4px 6px; text-align: center; border: 1px solid #0f172a; font-weight: 800; font-size: 11px;">${
                item.quantity
              }</td>
              <td style="padding: 4px 6px; text-align: right; border: 1px solid #0f172a; font-family: monospace; font-size: 10.5px;">₹${(
                item.unitPrice / 1.18
              ).toFixed(2)}</td>
              <td style="padding: 4px 6px; text-align: right; border: 1px solid #0f172a; font-family: monospace; font-size: 10.5px;">₹${itemTaxable}</td>
              <td style="padding: 4px 6px; text-align: right; border: 1px solid #0f172a; font-family: monospace; font-size: 10px;">₹${itemCgst}</td>
              <td style="padding: 4px 6px; text-align: right; border: 1px solid #0f172a; font-family: monospace; font-size: 10px;">₹${itemSgst}</td>
              <td style="padding: 4px 6px; text-align: right; border: 1px solid #0f172a; font-family: monospace; font-weight: 800; font-size: 11px; color: #0f172a;">₹${itemTotal.toFixed(
                2
              )}</td>
            </tr>
          `;
        })
        .join("");

      const pagesHtml = Array(copies)
        .fill(null)
        .map(
          () => `
        <div class="a4-page-full">
          <!-- TOP 3-BOX HEADER -->
          <div style="display: grid; grid-template-columns: 1.25fr 1.2fr 0.95fr; border-bottom: 1.5px solid #0f172a;">
            <!-- BOX 1: SELLER -->
            <div style="padding: 6px 8px; border-right: 1.5px solid #0f172a;">
              ${
                logoUrl
                  ? `<div style="margin-bottom: 4px;"><img src="${logoUrl}" alt="Logo" style="max-height: 28px; max-width: 120px; object-fit: contain; display: block;" onerror="this.style.display='none'" /></div>`
                  : ""
              }
              <div style="font-size: 15px; font-weight: 900; color: #0f172a; text-transform: uppercase; line-height: 1.1;">${sellerName}</div>
              ${
                sellerTagline
                  ? `<div style="font-size: 9px; font-weight: 700; color: #475569; margin-top: 1px;">${sellerTagline}</div>`
                  : ""
              }
              <div style="font-size: 9px; color: #334155; margin-top: 3px; line-height: 1.3;">
                ${sellerAddress}
              </div>
              <div style="font-size: 9px; color: #334155; margin-top: 1px;">
                Tel: <strong>${sellerPhone}</strong> | Email: <strong>${sellerEmail}</strong>
              </div>
              <div style="font-size: 9px; font-weight: 800; color: #0f172a; margin-top: 2px;">
                GSTIN: <span style="font-family: monospace;">${sellerGstin}</span> | State: <strong>${sellerStateName}</strong> | PAN: <span style="font-family: monospace;">${sellerPan}</span>
              </div>
            </div>

            <!-- BOX 2: BUYER -->
            <div style="padding: 6px 8px; border-right: 1.5px solid #0f172a; background: #fafbfc;">
              <div style="font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; border-bottom: 0.8px solid #cbd5e1; padding-bottom: 2px; margin-bottom: 3px;">
                BUYER / CONSIGNEE (BILL & SHIP TO):
              </div>
              <div style="font-size: 13px; font-weight: 900; color: #0f172a; text-transform: uppercase; line-height: 1.1;">
                ${data.buyerName}
              </div>
              <div style="font-size: 9.5px; color: #334155; line-height: 1.3; margin-top: 3px;">
                ${data.shippingAddress}${
            data.city ? `, ${data.city}, ${data.state || ""} - ${data.pincode || ""}` : ""
          }
              </div>
              <div style="font-size: 9px; color: #334155; margin-top: 2px;">
                ${
                  data.buyerPhone
                    ? `Contact: <strong>${data.buyerPhone}</strong> | `
                    : ""
                }State: <strong>${data.state || "Maharashtra (27)"}</strong>
              </div>
              <div style="font-size: 9px; color: #0f172a; font-weight: 700; margin-top: 2px;">
                Place of Supply: <strong>${
                  data.state || "Maharashtra (27)"
                }</strong> | Reverse Charge: <strong>NO</strong>
              </div>
            </div>

            <!-- BOX 3: META -->
            <div style="padding: 6px 8px; background: #fff;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #0f172a; padding-bottom: 3px; margin-bottom: 3px;">
                <span style="font-size: 12px; font-weight: 900; color: #0f172a; letter-spacing: 0.5px;">TAX INVOICE</span>
                <span style="font-size: 8.5px; font-weight: 800; padding: 2px 6px; background: #0f172a; color: #fff; border-radius: 3px; text-transform: uppercase;">
                  ORIGINAL
                </span>
              </div>
              <div style="font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 3px;">
                ORIGINAL FOR RECIPIENT
              </div>
              <div style="font-size: 9px; font-family: monospace; line-height: 1.45;">
                <div><strong>INVOICE NO:</strong> <span style="font-weight: 800; color: #0f172a;">${invoiceNum}</span></div>
                <div><strong>DATE:</strong> ${new Date(
                  data.invoiceDate || Date.now()
                ).toLocaleDateString("en-IN")}</div>
                <div><strong>ORDER REF:</strong> #${data.orderId}</div>
                <div><strong>COURIER:</strong> ${courierName}</div>
                <div><strong>AWB NO:</strong> <span style="font-weight: 700;">${tracking}</span></div>
              </div>
            </div>
          </div>

          <!-- TABLE OF GOODS -->
          <table style="width: 100%; border-collapse: collapse; font-size: 9.5px;">
            <thead>
              <tr style="background: #f1f5f9; color: #0f172a; font-size: 8.5px; font-weight: 800; text-transform: uppercase;">
                <th style="padding: 4px 6px; border: 1px solid #0f172a; width: 25px; text-align: center;">#</th>
                <th style="padding: 4px 6px; border: 1px solid #0f172a; width: 50px; text-align: center;">HSN</th>
                <th style="padding: 4px 6px; border: 1px solid #0f172a; width: 85px; text-align: left;">SKU / CODE</th>
                <th style="padding: 4px 6px; border: 1px solid #0f172a; text-align: left;">PRODUCT DESCRIPTION & SPECIFICATIONS</th>
                <th style="padding: 4px 6px; border: 1px solid #0f172a; width: 35px; text-align: center;">QTY</th>
                <th style="padding: 4px 6px; border: 1px solid #0f172a; width: 65px; text-align: right;">RATE (₹)</th>
                <th style="padding: 4px 6px; border: 1px solid #0f172a; width: 70px; text-align: right;">TAXABLE</th>
                <th style="padding: 4px 6px; border: 1px solid #0f172a; width: 60px; text-align: right;">CGST (9%)</th>
                <th style="padding: 4px 6px; border: 1px solid #0f172a; width: 60px; text-align: right;">SGST (9%)</th>
                <th style="padding: 4px 6px; border: 1px solid #0f172a; width: 75px; text-align: right;">TOTAL (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr style="background: #f8fafc; font-weight: 800; font-size: 10px;">
                <td colspan="4" style="padding: 4px 6px; border: 1px solid #0f172a; text-align: left;">
                  Totals: <strong>${displayItems.length} Item(s)</strong>
                </td>
                <td style="padding: 4px 6px; border: 1px solid #0f172a; text-align: center; font-weight: 900;">${displayItems.reduce(
                  (a, b) => a + b.quantity,
                  0
                )}</td>
                <td style="border: 1px solid #0f172a;"></td>
                <td style="padding: 4px 6px; border: 1px solid #0f172a; text-align: right; font-family: monospace;">₹${taxableValue.toFixed(
                  2
                )}</td>
                <td style="padding: 4px 6px; border: 1px solid #0f172a; text-align: right; font-family: monospace;">₹${cgst.toFixed(
                  2
                )}</td>
                <td style="padding: 4px 6px; border: 1px solid #0f172a; text-align: right; font-family: monospace;">₹${sgst.toFixed(
                  2
                )}</td>
                <td style="padding: 4px 6px; border: 1px solid #0f172a; text-align: right; font-family: monospace; font-weight: 900; color: #0f172a;">₹${grandTotal.toFixed(
                  2
                )}</td>
              </tr>
            </tfoot>
          </table>

          <!-- BOTTOM 3-BOX SUMMARY & SETTLEMENT FOOTER -->
          <div class="summary-footer-box" style="display: grid; grid-template-columns: 1.4fr 1fr 1fr; border-top: 1.5px solid #0f172a; page-break-inside: avoid; break-inside: avoid;">
            <!-- COL 1: DECLARATION, WORDS, BANK & TERMS -->
            <div style="padding: 6px 8px; border-right: 1.5px solid #0f172a; font-size: 8.5px; line-height: 1.35;">
              <div>
                <strong style="color: #0f172a;">Declaration:</strong> I/We hereby certify that goods/products mentioned in this invoice are warranted to be genuine and of standard quality.
              </div>
              <div style="border-top: 0.8px dashed #94a3b8; margin-top: 3px; padding-top: 3px;">
                <strong style="color: #0f172a;">Amount in Words:</strong> <span style="font-weight: 700;">${numberToWords(
                  grandTotal
                )}</span>
              </div>
              <div style="border-top: 0.8px dashed #94a3b8; margin-top: 3px; padding-top: 3px; color: #334155;">
                <strong>Settlement Bank:</strong> ${bankName} | <strong>A/C:</strong> <span style="font-family: monospace; font-weight: 700;">${bankAccount}</span> | <strong>IFSC:</strong> <span style="font-family: monospace; font-weight: 700;">${bankIfsc}</span>${
                  showUpi && bankUpi
                    ? ` | <strong>UPI:</strong> ${bankUpi}`
                    : ""
                }
              </div>
              <div style="font-size: 8px; color: #64748b; margin-top: 3px;">
                <strong>Terms:</strong> Standard manufacturer warranty applies. Subject to Mumbai Jurisdiction. E.&O.E.
              </div>
            </div>

            <!-- COL 2: TAX VERIFICATION & DISPATCH -->
            <div style="padding: 6px 8px; border-right: 1.5px solid #0f172a; background: #fafbfc; font-size: 8.5px; line-height: 1.4;">
              <div style="display: flex; justify-content: space-between;">
                <span>Taxable Value:</span> <strong style="font-family: monospace;">₹${taxableValue.toFixed(2)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>CGST (9%):</span> <span style="font-family: monospace;">₹${cgst.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>SGST (9%):</span> <span style="font-family: monospace;">₹${sgst.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-top: 0.8px solid #cbd5e1; margin-top: 2px; padding-top: 2px; font-weight: 800;">
                <span>Total GST:</span> <span style="font-family: monospace;">₹${totalGst.toFixed(2)}</span>
              </div>
              <div style="border-top: 0.8px solid #cbd5e1; margin-top: 3px; padding-top: 3px; font-size: 8px; color: #475569;">
                Reverse Charge: <strong>NO</strong> | Mode: <strong>${data.paymentMethod || "PREPAID"}</strong><br/>
                Packed by: <strong>Verified</strong> | Courier: <strong>${courierName}</strong>
              </div>
            </div>

            <!-- COL 3: TOTALS & SIGNATURE -->
            <div style="padding: 6px 8px; font-size: 9px; line-height: 1.45; text-align: right;">
              <div style="display: flex; justify-content: space-between; font-size: 8.5px;">
                <span>Gross Taxable:</span> <span style="font-family: monospace;">₹${taxableValue.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 8.5px;">
                <span>Add GST (18%):</span> <span style="font-family: monospace;">₹${totalGst.toFixed(2)}</span>
              </div>
              <div style="border: 1.5px solid #0f172a; background: #0f172a; color: #ffffff; padding: 3px 6px; border-radius: 3px; margin-top: 3px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 800; font-size: 9px; letter-spacing: 0.5px;">BILL AMT / TO PAY:</span>
                <span style="font-family: monospace; font-weight: 900; font-size: 12px;">₹${grandTotal.toFixed(2)}</span>
              </div>
              <div style="margin-top: 8px; font-size: 8px;">
                <div style="font-weight: 800; color: #0f172a;">For ${sellerName}</div>
                <div style="margin-top: 14px; border-top: 1px solid #94a3b8; display: inline-block; padding-top: 2px; color: #475569; font-weight: 700;">
                  ${signatoryName} (${signatoryDesignation})
                </div>
              </div>
            </div>
          </div>
        </div>
      `
        )
        .join("");

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Tax Invoice - ${invoiceNum} - ${data.orderId}</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 8mm 8mm 10mm 8mm;
              }
              * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
                background: #fff;
                color: #0f172a;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .a4-page-full {
                width: 100%;
                box-sizing: border-box;
                page-break-after: always;
                break-after: page;
                border: 1.5px solid #0f172a;
                background: #fff;
              }
              table {
                page-break-inside: auto;
              }
              thead {
                display: table-header-group;
              }
              tfoot {
                display: table-row-group;
              }
              tr {
                page-break-inside: avoid;
                break-inside: avoid;
              }
              .summary-footer-box {
                page-break-inside: avoid;
                break-inside: avoid;
              }
            </style>
          </head>
          <body>
            ${pagesHtml}
            <script>
              setTimeout(() => {
                window.print();
                window.close();
              }, 400);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      onClose();
      return;
    }

    // THERMAL LABEL MODE (100mm x 150mm)
    const itemsRows = displayItems
      .map(
        (item, idx) => `
        <tr>
          <td style="padding: 2.5px 3px; font-weight: 700; max-width: 45mm; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${
            idx + 1
          }. ${item.title}</td>
          <td style="padding: 2.5px 3px; font-family: monospace; font-size: 8px;">${
            item.sku
          }</td>
          <td style="padding: 2.5px 3px; text-align: center; font-size: 8px;">${
            item.hsn || "8525"
          }</td>
          <td style="padding: 2.5px 3px; text-align: center; font-weight: 800;">${
            item.quantity
          }</td>
          <td style="padding: 2.5px 3px; text-align: right; font-family: monospace;">₹${item.unitPrice.toFixed(
            2
          )}</td>
          <td style="padding: 2.5px 3px; text-align: right; font-weight: 800; font-family: monospace;">₹${(
            item.total || item.unitPrice * item.quantity
          ).toFixed(2)}</td>
        </tr>
      `
      )
      .join("");

    const pagesHtml = Array(copies)
      .fill(null)
      .map(
        (_, pageIdx) => `
        <div class="parcel-page">
          <!-- TOP LOGISTICS & ROUTING HEADER -->
          <div class="header-row">
            <div class="carrier-box">
              <div class="carrier-name">${courierName}</div>
              <div class="routing-badge">${routing}</div>
            </div>
            <div class="channel-box">
              <div class="channel-title">${
                isAmazon
                  ? "AMAZON.IN"
                  : isFlipkart
                  ? "FLIPKART"
                  : data.channel === "POS"
                  ? "POS RETAIL"
                  : "DIRECT DISPATCH"
              }</div>
              <div class="payment-badge">${data.paymentMethod || "PREPAID"}</div>
            </div>
          </div>

          <!-- AWB / TRACKING BARCODE -->
          <div class="barcode-section">
            <div class="barcode-label">TRACKING / AWB: <strong>${tracking}</strong></div>
            <svg id="trk-bc-${pageIdx}"></svg>
          </div>

          <!-- ORDER ID ROW -->
          <div class="order-id-row">
            <span>Order ID: <strong>#${data.orderId}</strong></span>
            <span>Date: ${new Date(
              data.orderDate || Date.now()
            ).toLocaleDateString("en-IN")}</span>
          </div>

          <!-- SHIPPING ADDRESS & SELLER SPLIT -->
          <div class="address-split">
            <div class="deliver-to">
              <div class="section-title">DELIVER TO:</div>
              <div class="buyer-name">${data.buyerName}</div>
              <div class="buyer-addr">${data.shippingAddress}</div>
              <div class="pincode-box">
                PIN: <span>${data.pincode || "400001"}</span>
              </div>
              ${
                data.buyerPhone
                  ? `<div class="phone">Tel: ${data.buyerPhone}</div>`
                  : ""
              }
            </div>

            <div class="sold-by">
              <div class="section-title">SOLD BY (RETURN TO):</div>
              <div class="seller-name">${sellerName}</div>
              <div class="seller-info">
                GSTIN: <strong>${sellerGstin}</strong><br/>
                ${sellerAddress}
              </div>
              <div class="invoice-meta">
                <strong>Tax Invoice:</strong> ${invoiceNum}<br/>
                <strong>Invoice Date:</strong> ${new Date(
                  data.invoiceDate || Date.now()
                ).toLocaleDateString("en-IN")}
              </div>
            </div>
          </div>

          <!-- PARCEL TAX INVOICE ITEMS SUMMARY -->
          <div class="invoice-table-box">
            <div class="section-title">TAX INVOICE / PACKING SLIP SUMMARY</div>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>SKU / Code</th>
                  <th style="text-align: center;">HSN</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Price</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>
          </div>

          <!-- TOTAL & VERIFICATION FOOTER -->
          <div class="footer-totals">
            <div class="footer-left">
              <div class="barcode-label">INVOICE BARCODE:</div>
              <svg id="inv-bc-${pageIdx}"></svg>
            </div>
            <div class="footer-right">
              <div class="total-row">
                <span>Grand Total:</span>
                <strong>₹${grandTotal.toFixed(2)}</strong>
              </div>
              <div class="gst-note">Includes Applicable GST (18%)</div>
              <div class="auth-sign">Authorized Signatory</div>
            </div>
          </div>

          <div class="footer-disclaimer">
            Official Tax Invoice & Parcel Documentation &bull; Computer Generated Document &bull; Valid Without Signature
          </div>
        </div>
      `
      )
      .join("");

    const jsBarcodesInit = Array(copies)
      .fill(null)
      .map(
        (_, idx) => `
        JsBarcode("#trk-bc-${idx}", "${tracking.replace(/[^a-zA-Z0-9-]/g, "")}", {
          format: "CODE128",
          width: 1.6,
          height: 36,
          displayValue: false,
          margin: 0
        });

        JsBarcode("#inv-bc-${idx}", "${data.orderId.replace(/[^a-zA-Z0-9]/g, "")}", {
          format: "CODE128",
          width: 1.2,
          height: 24,
          displayValue: false,
          margin: 0
        });
      `
      )
      .join("\n");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Shipping Invoice Label (100mm x 150mm) - ${data.orderId}</title>
          <style>
            @page {
              size: 100mm 150mm;
              margin: 0;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              background: #fff;
              color: #000;
              -webkit-print-color-adjust: exact;
            }
            .parcel-page {
              width: 100mm;
              height: 150mm;
              box-sizing: border-box;
              padding: 3mm 3.5mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              border: 1.5px solid #000;
              page-break-after: always;
              break-after: page;
              overflow: hidden;
            }
            .header-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1.5px solid #000;
              padding-bottom: 2mm;
            }
            .carrier-name {
              font-size: 14px;
              font-weight: 900;
              letter-spacing: 0.5px;
            }
            .routing-badge {
              display: inline-block;
              font-size: 11px;
              font-weight: 800;
              background: #000;
              color: #fff;
              padding: 1px 5px;
              border-radius: 3px;
              margin-top: 1px;
            }
            .channel-box {
              text-align: right;
            }
            .channel-title {
              font-size: 12px;
              font-weight: 900;
            }
            .payment-badge {
              display: inline-block;
              font-size: 11px;
              font-weight: 900;
              border: 1.5px solid #000;
              padding: 1px 6px;
              border-radius: 3px;
              margin-top: 1px;
            }
            .barcode-section {
              text-align: center;
              padding: 1.5mm 0;
              border-bottom: 1px solid #000;
            }
            .barcode-label {
              font-size: 9px;
              font-family: monospace;
              margin-bottom: 1px;
            }
            .barcode-section svg {
              width: 88%;
              max-height: 12mm;
            }
            .order-id-row {
              display: flex;
              justify-content: space-between;
              font-size: 9px;
              padding: 1mm 0;
              border-bottom: 1px solid #000;
              font-family: monospace;
            }
            .address-split {
              display: grid;
              grid-template-columns: 1.2fr 1fr;
              gap: 2mm;
              padding: 2mm 0;
              border-bottom: 1px solid #000;
              font-size: 8.5px;
              line-height: 1.25;
            }
            .section-title {
              font-size: 7.5px;
              font-weight: 800;
              text-transform: uppercase;
              color: #333;
              margin-bottom: 1px;
            }
            .buyer-name {
              font-size: 11px;
              font-weight: 800;
              margin-bottom: 1px;
            }
            .buyer-addr {
              max-height: 22mm;
              overflow: hidden;
            }
            .pincode-box {
              margin-top: 2mm;
              display: inline-block;
              border: 1.5px solid #000;
              padding: 1.5px 5px;
              font-size: 10px;
              font-weight: 900;
            }
            .pincode-box span {
              font-size: 12px;
            }
            .sold-by {
              border-left: 1px dashed #666;
              padding-left: 2mm;
            }
            .seller-name {
              font-weight: 800;
            }
            .seller-info {
              color: #333;
              font-size: 8px;
            }
            .invoice-meta {
              margin-top: 1.5mm;
              font-size: 8px;
            }
            .invoice-table-box {
              padding: 1.5mm 0;
              border-bottom: 1px solid #000;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 7.5px;
              margin-top: 1mm;
            }
            .items-table th {
              background: #f0f0f0;
              border: 0.5px solid #000;
              padding: 1.5px 3px;
              text-align: left;
              font-weight: 800;
            }
            .items-table td {
              border: 0.5px solid #000;
            }
            .footer-totals {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 1.5mm 0;
            }
            .footer-left svg {
              width: 32mm;
              max-height: 8mm;
            }
            .footer-right {
              text-align: right;
            }
            .total-row {
              font-size: 11px;
            }
            .total-row strong {
              font-size: 13px;
            }
            .gst-note {
              font-size: 7px;
              color: #444;
            }
            .auth-sign {
              font-size: 7.5px;
              font-weight: 600;
              margin-top: 1mm;
            }
            .footer-disclaimer {
              text-align: center;
              font-size: 6.5px;
              color: #555;
              border-top: 0.5px solid #aaa;
              padding-top: 1px;
            }
          </style>
        </head>
        <body>
          ${pagesHtml}
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <script>
            ${jsBarcodesInit}
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto pointer-events-auto">
      <div className="relative z-[10000] bg-white border border-[#cce7ed] rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 text-slate-800 animate-in fade-in zoom-in-95 my-auto max-h-[95vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#056468]" />
              <span>Tax Invoice & Shipping Label Hub</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Order #{data.orderId} • GST Compliant Tax Document & Courier
              Barcode
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Format Switcher Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDocMode("A4_INVOICE")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  docMode === "A4_INVOICE"
                    ? "bg-[#056468] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>A4 GST Invoice</span>
              </button>

              <button
                type="button"
                onClick={() => setDocMode("THERMAL_LABEL")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  docMode === "THERMAL_LABEL"
                    ? "bg-[#056468] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>100×150mm Label</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* A4 Layout Selector Toolbar */}
          {docMode === "A4_INVOICE" && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-gradient-to-r from-teal-50/80 via-white to-slate-50 border border-teal-200/80 rounded-xl shadow-2xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#056468]">
                <Layers className="w-4 h-4 text-[#056468]" />
                <span>A4 Page Printing Format:</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setA4Layout("2_IN_1_DUAL")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    a4Layout === "2_IN_1_DUAL"
                      ? "bg-[#056468] text-white shadow-xs ring-1 ring-[#056468]"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>2-in-1 Dual Copy (Buyer + Seller on 1 Page)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setA4Layout("FULL_PAGE")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    a4Layout === "FULL_PAGE"
                      ? "bg-[#056468] text-white shadow-xs ring-1 ring-[#056468]"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span>Full Page (1 Copy)</span>
                </button>
              </div>
            </div>
          )}

          {/* Live Document Preview Container */}
          {docMode === "A4_INVOICE" ? (
            a4Layout === "2_IN_1_DUAL" ? (
              /* DUAL COPY PREVIEW (2-in-1 on single A4) */
              <div className="bg-slate-200/90 border border-slate-400 rounded-xl p-3 sm:p-4 text-xs shadow-inner space-y-3 font-sans">
                {/* 1. TOP HALF: BUYER'S COPY (ERP Tax Invoice) */}
                <div className="bg-white border-2 border-slate-900 rounded-sm shadow-xs overflow-hidden text-[9px] leading-tight">
                  {/* 3-COLUMN TOP HEADER */}
                  <div className="grid grid-cols-[1.3fr_1.3fr_1.1fr] border-b border-slate-900 bg-white">
                    {/* Box 1: Seller */}
                    <div className="p-2 border-r border-slate-900">
                      {logoUrl && (
                        <img
                          src={logoUrl}
                          alt="Logo"
                          className="h-5 max-h-5 max-w-[90px] object-contain mb-1 block"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      )}
                      <div className="font-black text-[11px] text-slate-900 uppercase tracking-tight">
                        {sellerName}
                      </div>
                      {sellerTagline && (
                        <div className="text-[8px] font-semibold text-slate-600">
                          {sellerTagline}
                        </div>
                      )}
                      <div className="text-[8.5px] text-slate-700 mt-0.5 leading-tight">
                        {sellerAddress}
                      </div>
                      <div className="text-[8px] text-slate-800 font-medium mt-1">
                        GSTIN: <span className="font-mono font-bold text-slate-950">{sellerGstin}</span> • PAN: <span className="font-mono font-bold">{sellerPan}</span>
                      </div>
                      <div className="text-[8px] text-slate-700">
                        State: <strong>{sellerStateName}</strong>
                      </div>
                    </div>

                    {/* Box 2: Buyer / Consignee */}
                    <div className="p-2 border-r border-slate-900 bg-slate-50/50">
                      <div className="text-[8px] font-black text-slate-900 uppercase border-b border-slate-200 pb-0.5 mb-1">
                        Consignee / Billed & Shipped To:
                      </div>
                      <div className="font-bold text-slate-950 text-[10px]">
                        {data.buyerName}
                      </div>
                      <div className="text-[8.5px] text-slate-700 mt-0.5 line-clamp-2">
                        {data.shippingAddress}
                      </div>
                      <div className="text-[8px] text-slate-800 font-medium mt-1">
                        PIN: <strong>{data.pincode || "400001"}</strong> • State: <strong>{data.state || "Maharashtra (27)"}</strong>
                        {data.buyerPhone ? ` • Ph: ${data.buyerPhone}` : ""}
                      </div>
                      <div className="text-[7.5px] text-slate-600 mt-0.5 font-semibold">
                        Place of Supply: <strong>{data.state || "Maharashtra (27)"}</strong> • Rev. Charge: <strong>NO</strong>
                      </div>
                    </div>

                    {/* Box 3: Invoice Meta */}
                    <div className="p-2 bg-white">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-1 mb-1">
                        <span className="font-black text-[10px] text-slate-900 tracking-wider">
                          TAX INVOICE
                        </span>
                        <span className="px-1.5 py-0.5 bg-slate-900 text-white font-black text-[7.5px] rounded uppercase">
                          BUYER'S COPY
                        </span>
                      </div>
                      <div className="text-[7.5px] font-bold text-slate-500 uppercase mb-1">
                        ORIGINAL FOR RECIPIENT
                      </div>
                      <div className="font-mono text-[8px] space-y-0.5 text-slate-800">
                        <div><strong>INV NO:</strong> <span className="font-bold text-slate-950">{invoiceNum}</span></div>
                        <div><strong>DATE:</strong> {new Date(data.invoiceDate || Date.now()).toLocaleDateString("en-IN")}</div>
                        <div><strong>ORDER REF:</strong> #{data.orderId}</div>
                        <div><strong>COURIER:</strong> {courierName}</div>
                        <div><strong>AWB:</strong> <span className="font-bold">{tracking}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* HIGH DENSITY ERP PRODUCTS TABLE */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[8px] border-collapse">
                      <thead className="bg-slate-100 text-slate-900 font-black uppercase text-[7.5px] border-b border-slate-900">
                        <tr>
                          <th className="p-1 text-center w-5 border-r border-slate-900">#</th>
                          <th className="p-1 text-center w-10 border-r border-slate-900">HSN</th>
                          <th className="p-1 w-16 border-r border-slate-900">SKU / CODE</th>
                          <th className="p-1 border-r border-slate-900">PRODUCT DESCRIPTION</th>
                          <th className="p-1 text-center w-8 border-r border-slate-900">QTY</th>
                          <th className="p-1 text-right w-12 border-r border-slate-900">RATE (₹)</th>
                          <th className="p-1 text-right w-12 border-r border-slate-900">TAXABLE</th>
                          <th className="p-1 text-right w-11 border-r border-slate-900">CGST (9%)</th>
                          <th className="p-1 text-right w-11 border-r border-slate-900">SGST (9%)</th>
                          <th className="p-1 text-right w-14 font-black">TOTAL (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300">
                        {displayItems.map((itm, i) => {
                          const itmTotal = itm.total || (itm.unitPrice || 0) * (itm.quantity || 1);
                          const itmTaxable = itmTotal / 1.18;
                          const itmGst = itmTotal - itmTaxable;
                          const itmHalfGst = itmGst / 2;
                          const itmUnitRate = itm.unitPrice ? (itm.unitPrice / 1.18) : (itmTaxable / (itm.quantity || 1));
                          return (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="p-1 text-center font-bold text-slate-600 border-r border-slate-900">{i + 1}</td>
                              <td className="p-1 text-center font-mono border-r border-slate-900">{itm.hsn || "8525"}</td>
                              <td className="p-1 font-mono font-semibold border-r border-slate-900 truncate max-w-[70px]">{itm.sku}</td>
                              <td className="p-1 font-medium text-slate-900 border-r border-slate-900">
                                <div>{itm.title}</div>
                                {itm.unitBarcode && (
                                  <div className="text-[7px] text-slate-500 font-mono">BC: {itm.unitBarcode}</div>
                                )}
                              </td>
                              <td className="p-1 text-center font-bold border-r border-slate-900">{itm.quantity}</td>
                              <td className="p-1 text-right font-mono border-r border-slate-900">{itmUnitRate.toFixed(2)}</td>
                              <td className="p-1 text-right font-mono border-r border-slate-900">{itmTaxable.toFixed(2)}</td>
                              <td className="p-1 text-right font-mono border-r border-slate-900 text-slate-600">{itmHalfGst.toFixed(2)}</td>
                              <td className="p-1 text-right font-mono border-r border-slate-900 text-slate-600">{itmHalfGst.toFixed(2)}</td>
                              <td className="p-1 text-right font-mono font-bold text-slate-950">₹{itmTotal.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-100 font-black border-t border-slate-900 text-[8px]">
                        <tr>
                          <td colSpan={4} className="p-1 border-r border-slate-900 text-left">
                            Totals: <strong>{displayItems.length} Item(s)</strong>
                          </td>
                          <td className="p-1 text-center border-r border-slate-900 font-black">
                            {displayItems.reduce((a, b) => a + b.quantity, 0)}
                          </td>
                          <td className="border-r border-slate-900"></td>
                          <td className="p-1 text-right font-mono border-r border-slate-900">₹{taxableValue.toFixed(2)}</td>
                          <td className="p-1 text-right font-mono border-r border-slate-900">₹{cgst.toFixed(2)}</td>
                          <td className="p-1 text-right font-mono border-r border-slate-900">₹{sgst.toFixed(2)}</td>
                          <td className="p-1 text-right font-mono font-black text-slate-950">₹{grandTotal.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* 3-COLUMN SETTLEMENT & TAX FOOTER */}
                  <div className="grid grid-cols-[1.3fr_0.9fr_1fr] border-t border-slate-900 text-[7.5px] bg-white">
                    {/* Left: Declaration & Bank */}
                    <div className="p-1.5 border-r border-slate-900 leading-snug space-y-1">
                      <div>
                        <strong>Declaration:</strong> I/We hereby certify that goods/products mentioned in this invoice are warranted to be genuine and of standard quality.
                      </div>
                      <div className="border-t border-dashed border-slate-300 pt-0.5">
                        <strong>Amount in Words:</strong> <span className="font-semibold">{numberToWords(grandTotal)}</span>
                      </div>
                      <div className="border-t border-dashed border-slate-300 pt-0.5 text-slate-700">
                        <strong>Bank:</strong> {bankName} | <strong>A/C:</strong> <span className="font-mono font-bold">{bankAccount}</span> | <strong>IFSC:</strong> <span className="font-mono font-bold">{bankIfsc}</span>
                      </div>
                      <div className="text-[7px] text-slate-500">
                        <strong>Terms:</strong> Standard warranty applies. Subject to Mumbai Jurisdiction. E.&O.E.
                      </div>
                    </div>

                    {/* Middle: Tax Analysis */}
                    <div className="p-1.5 border-r border-slate-900 bg-slate-50/70 font-mono space-y-0.5 leading-snug">
                      <div className="flex justify-between">
                        <span>Taxable Value:</span> <strong>₹{taxableValue.toFixed(2)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>CGST (9%):</span> <span>₹{cgst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>SGST (9%):</span> <span>₹{sgst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-300 pt-0.5 font-bold">
                        <span>Total GST:</span> <span>₹{totalGst.toFixed(2)}</span>
                      </div>
                      <div className="text-[7px] font-sans text-slate-600 border-t border-slate-200 pt-0.5">
                        Rev. Charge: <strong>NO</strong> • Courier: <strong>{courierName}</strong>
                      </div>
                    </div>

                    {/* Right: Bill Amt & Signature */}
                    <div className="p-1.5 text-right space-y-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between text-[7.5px] font-mono">
                          <span>Gross:</span> <span>₹{taxableValue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[7.5px] font-mono">
                          <span>GST (18%):</span> <span>₹{totalGst.toFixed(2)}</span>
                        </div>
                        <div className="bg-slate-900 text-white p-1 rounded-xs flex justify-between items-center font-bold mt-1">
                          <span className="text-[7.5px] tracking-wide">BILL AMT / TO PAY:</span>
                          <span className="font-mono text-[9.5px] font-black">₹{grandTotal.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="pt-2 text-[7px]">
                        <div className="font-bold text-slate-900">For {sellerName}</div>
                        <div className="mt-2 pt-0.5 border-t border-slate-400 font-semibold text-slate-600 inline-block">
                          {signatoryName} ({signatoryDesignation})
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. SCISSOR CUT DIVIDER */}
                <div className="flex items-center justify-center gap-2 py-1 text-slate-600 font-mono text-[9px] font-black border-y-2 border-dashed border-slate-500 bg-slate-200/80 rounded">
                  <span>✂</span>
                  <span className="tracking-widest uppercase text-[8px]">
                    Cut Along Dotted Line (Top: Buyer Copy • Bottom: Seller Copy)
                  </span>
                  <span>✂</span>
                </div>

                {/* 3. BOTTOM HALF: SELLER'S COPY (ERP Tax Invoice) */}
                <div className="bg-white border-2 border-slate-700 rounded-sm shadow-xs overflow-hidden text-[9px] leading-tight opacity-95">
                  {/* 3-COLUMN TOP HEADER */}
                  <div className="grid grid-cols-[1.3fr_1.3fr_1.1fr] border-b border-slate-700 bg-white">
                    {/* Box 1: Seller */}
                    <div className="p-2 border-r border-slate-700">
                      {logoUrl && (
                        <img
                          src={logoUrl}
                          alt="Logo"
                          className="h-5 max-h-5 max-w-[90px] object-contain mb-1 block"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      )}
                      <div className="font-black text-[11px] text-slate-900 uppercase tracking-tight">
                        {sellerName}
                      </div>
                      <div className="text-[8.5px] text-slate-700 mt-0.5 leading-tight">
                        {sellerAddress}
                      </div>
                      <div className="text-[8px] text-slate-800 font-medium mt-1">
                        GSTIN: <span className="font-mono font-bold text-slate-950">{sellerGstin}</span> • PAN: <span className="font-mono font-bold">{sellerPan}</span>
                      </div>
                      <div className="text-[8px] text-slate-700">
                        State: <strong>{sellerStateName}</strong>
                      </div>
                    </div>

                    {/* Box 2: Buyer / Consignee */}
                    <div className="p-2 border-r border-slate-700 bg-slate-50/50">
                      <div className="text-[8px] font-black text-slate-900 uppercase border-b border-slate-200 pb-0.5 mb-1">
                        Consignee / Billed & Shipped To:
                      </div>
                      <div className="font-bold text-slate-950 text-[10px]">
                        {data.buyerName}
                      </div>
                      <div className="text-[8.5px] text-slate-700 mt-0.5 line-clamp-2">
                        {data.shippingAddress}
                      </div>
                      <div className="text-[8px] text-slate-800 font-medium mt-1">
                        PIN: <strong>{data.pincode || "400001"}</strong> • State: <strong>{data.state || "Maharashtra (27)"}</strong>
                      </div>
                      <div className="text-[7.5px] text-slate-600 mt-0.5 font-semibold">
                        Place of Supply: <strong>{data.state || "Maharashtra (27)"}</strong> • Rev. Charge: <strong>NO</strong>
                      </div>
                    </div>

                    {/* Box 3: Invoice Meta */}
                    <div className="p-2 bg-white">
                      <div className="flex items-center justify-between border-b border-slate-700 pb-1 mb-1">
                        <span className="font-black text-[10px] text-slate-900 tracking-wider">
                          TAX INVOICE
                        </span>
                        <span className="px-1.5 py-0.5 bg-slate-700 text-white font-black text-[7.5px] rounded uppercase">
                          SELLER'S COPY
                        </span>
                      </div>
                      <div className="text-[7.5px] font-bold text-slate-500 uppercase mb-1">
                        DUPLICATE FOR SUPPLIER
                      </div>
                      <div className="font-mono text-[8px] space-y-0.5 text-slate-800">
                        <div><strong>INV NO:</strong> <span className="font-bold text-slate-950">{invoiceNum}</span></div>
                        <div><strong>DATE:</strong> {new Date(data.invoiceDate || Date.now()).toLocaleDateString("en-IN")}</div>
                        <div><strong>ORDER REF:</strong> #{data.orderId}</div>
                        <div><strong>COURIER:</strong> ${courierName}</div>
                        <div><strong>AWB:</strong> <span className="font-bold">{tracking}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* HIGH DENSITY ERP PRODUCTS TABLE */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[8px] border-collapse">
                      <thead className="bg-slate-100 text-slate-900 font-black uppercase text-[7.5px] border-b border-slate-700">
                        <tr>
                          <th className="p-1 text-center w-5 border-r border-slate-700">#</th>
                          <th className="p-1 text-center w-10 border-r border-slate-700">HSN</th>
                          <th className="p-1 w-16 border-r border-slate-700">SKU / CODE</th>
                          <th className="p-1 border-r border-slate-700">PRODUCT DESCRIPTION</th>
                          <th className="p-1 text-center w-8 border-r border-slate-700">QTY</th>
                          <th className="p-1 text-right w-12 border-r border-slate-700">RATE (₹)</th>
                          <th className="p-1 text-right w-12 border-r border-slate-700">TAXABLE</th>
                          <th className="p-1 text-right w-11 border-r border-slate-700">CGST (9%)</th>
                          <th className="p-1 text-right w-11 border-r border-slate-700">SGST (9%)</th>
                          <th className="p-1 text-right w-14 font-black">TOTAL (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300">
                        {displayItems.map((itm, i) => {
                          const itmTotal = itm.total || (itm.unitPrice || 0) * (itm.quantity || 1);
                          const itmTaxable = itmTotal / 1.18;
                          const itmGst = itmTotal - itmTaxable;
                          const itmHalfGst = itmGst / 2;
                          const itmUnitRate = itm.unitPrice ? (itm.unitPrice / 1.18) : (itmTaxable / (itm.quantity || 1));
                          return (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="p-1 text-center font-bold text-slate-600 border-r border-slate-700">{i + 1}</td>
                              <td className="p-1 text-center font-mono border-r border-slate-700">{itm.hsn || "8525"}</td>
                              <td className="p-1 font-mono font-semibold border-r border-slate-700 truncate max-w-[70px]">{itm.sku}</td>
                              <td className="p-1 font-medium text-slate-900 border-r border-slate-700">
                                <div>{itm.title}</div>
                              </td>
                              <td className="p-1 text-center font-bold border-r border-slate-700">{itm.quantity}</td>
                              <td className="p-1 text-right font-mono border-r border-slate-700">{itmUnitRate.toFixed(2)}</td>
                              <td className="p-1 text-right font-mono border-r border-slate-700">{itmTaxable.toFixed(2)}</td>
                              <td className="p-1 text-right font-mono border-r border-slate-700 text-slate-600">{itmHalfGst.toFixed(2)}</td>
                              <td className="p-1 text-right font-mono border-r border-slate-700 text-slate-600">{itmHalfGst.toFixed(2)}</td>
                              <td className="p-1 text-right font-mono font-bold text-slate-950">₹{itmTotal.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-100 font-black border-t border-slate-700 text-[8px]">
                        <tr>
                          <td colSpan={4} className="p-1 border-r border-slate-700 text-left">
                            Totals: <strong>{displayItems.length} Item(s)</strong>
                          </td>
                          <td className="p-1 text-center border-r border-slate-700 font-black">
                            {displayItems.reduce((a, b) => a + b.quantity, 0)}
                          </td>
                          <td className="border-r border-slate-700"></td>
                          <td className="p-1 text-right font-mono border-r border-slate-700">₹{taxableValue.toFixed(2)}</td>
                          <td className="p-1 text-right font-mono border-r border-slate-700">₹{cgst.toFixed(2)}</td>
                          <td className="p-1 text-right font-mono border-r border-slate-700">₹{sgst.toFixed(2)}</td>
                          <td className="p-1 text-right font-mono font-black text-slate-950">₹{grandTotal.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* 3-COLUMN SETTLEMENT & TAX FOOTER */}
                  <div className="grid grid-cols-[1.3fr_0.9fr_1fr] border-t border-slate-700 text-[7.5px] bg-white">
                    {/* Left: Declaration & Notes */}
                    <div className="p-1.5 border-r border-slate-700 leading-snug space-y-1">
                      <div>
                        <strong>Internal Record Copy:</strong> Retain this voucher copy for sales ledger, accounts, tax filing and statutory audit purposes.
                      </div>
                      <div className="border-t border-dashed border-slate-300 pt-0.5">
                        <strong>Amount in Words:</strong> <span className="font-semibold">{numberToWords(grandTotal)}</span>
                      </div>
                      <div className="text-[7px] text-slate-500">
                        Subject to Mumbai Jurisdiction. E.&O.E.
                      </div>
                    </div>

                    {/* Middle: Tax Analysis */}
                    <div className="p-1.5 border-r border-slate-700 bg-slate-50/70 font-mono space-y-0.5 leading-snug">
                      <div className="flex justify-between">
                        <span>Taxable Value:</span> <strong>₹{taxableValue.toFixed(2)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Total GST:</span> <span>₹{totalGst.toFixed(2)}</span>
                      </div>
                      <div className="text-[7px] font-sans text-slate-600 border-t border-slate-200 pt-0.5">
                        Payment: <strong>{data.paymentMethod || "PREPAID"}</strong> • Courier: <strong>{courierName}</strong>
                      </div>
                    </div>

                    {/* Right: Bill Amt & Signature */}
                    <div className="p-1.5 text-right space-y-1 flex flex-col justify-between">
                      <div>
                        <div className="bg-slate-800 text-white p-1 rounded-xs flex justify-between items-center font-bold">
                          <span className="text-[7.5px] tracking-wide">BILL AMT:</span>
                          <span className="font-mono text-[9.5px] font-black">₹{grandTotal.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="pt-2 text-[7px]">
                        <div className="font-bold text-slate-900">For {sellerName}</div>
                        <div className="mt-2 pt-0.5 border-t border-slate-400 font-semibold text-slate-600 inline-block">
                          Verified & Authorized
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* SINGLE FULL PAGE A4 PREVIEW (ERP High-Density Grid) */
              <div className="bg-white border-2 border-slate-900 rounded-sm shadow-md text-xs font-sans">
                {/* 3-COLUMN TOP HEADER */}
                <div className="grid grid-cols-[1.4fr_1.3fr_1.1fr] border-b-2 border-slate-900">
                  {/* Box 1: Seller */}
                  <div className="p-3 border-r-2 border-slate-900">
                    {logoUrl && (
                      <img
                        src={logoUrl}
                        alt="Logo"
                        className="h-6 max-h-6 max-w-[120px] object-contain mb-1.5 block"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    )}
                    <h4 className="text-sm font-black text-slate-950 uppercase tracking-tight">
                      {sellerName}
                    </h4>
                    {sellerTagline && (
                      <p className="text-[9px] font-semibold text-slate-600">
                        {sellerTagline}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-700 mt-1 leading-snug">
                      {sellerAddress}
                    </p>
                    <p className="text-[9.5px] text-slate-800 font-medium mt-1.5">
                      GSTIN: <span className="font-mono font-bold text-slate-950">{sellerGstin}</span> • PAN: <span className="font-mono font-bold">{sellerPan}</span>
                    </p>
                    <p className="text-[9.5px] text-slate-700">
                      State: <strong>{sellerStateName}</strong>
                    </p>
                  </div>

                  {/* Box 2: Buyer / Consignee */}
                  <div className="p-3 border-r-2 border-slate-900 bg-slate-50/60">
                    <div className="text-[9px] font-black text-slate-900 uppercase border-b border-slate-200 pb-1 mb-1.5">
                      Consignee / Billed & Shipped To:
                    </div>
                    <div className="font-bold text-slate-950 text-xs">
                      {data.buyerName}
                    </div>
                    <div className="text-[10px] text-slate-700 mt-1 leading-snug">
                      {data.shippingAddress}
                    </div>
                    <div className="text-[9.5px] text-slate-800 font-medium mt-1.5">
                      PIN: <strong>{data.pincode || "400001"}</strong> • State: <strong>{data.state || "Maharashtra (27)"}</strong>
                      {data.buyerPhone ? ` • Ph: ${data.buyerPhone}` : ""}
                    </div>
                    <div className="text-[9px] text-slate-600 mt-1 font-semibold">
                      Place of Supply: <strong>{data.state || "Maharashtra (27)"}</strong> • Rev. Charge: <strong>NO</strong>
                    </div>
                  </div>

                  {/* Box 3: Invoice Meta */}
                  <div className="p-3 bg-white">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-1 mb-1.5">
                      <span className="font-black text-xs text-slate-900 tracking-wider">
                        TAX INVOICE
                      </span>
                      <span className="px-2 py-0.5 bg-slate-900 text-white font-black text-[8.5px] rounded uppercase">
                        ORIGINAL
                      </span>
                    </div>
                    <div className="font-mono text-[9px] space-y-1 text-slate-800">
                      <div><strong>INVOICE NO:</strong> <span className="font-bold text-slate-950">{invoiceNum}</span></div>
                      <div><strong>DATE:</strong> {new Date(data.invoiceDate || Date.now()).toLocaleDateString("en-IN")}</div>
                      <div><strong>ORDER REF:</strong> #{data.orderId}</div>
                      <div><strong>COURIER:</strong> {courierName}</div>
                      <div><strong>AWB NO:</strong> <span className="font-bold">{tracking}</span></div>
                    </div>
                  </div>
                </div>

                {/* HIGH DENSITY ERP PRODUCTS TABLE */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[9.5px] border-collapse">
                    <thead className="bg-slate-100 text-slate-900 font-black uppercase text-[8.5px] border-b-2 border-slate-900">
                      <tr>
                        <th className="p-1.5 text-center w-7 border-r border-slate-900">#</th>
                        <th className="p-1.5 text-center w-14 border-r border-slate-900">HSN</th>
                        <th className="p-1.5 w-24 border-r border-slate-900">SKU / CODE</th>
                        <th className="p-1.5 border-r border-slate-900">PRODUCT DESCRIPTION & SPECIFICATIONS</th>
                        <th className="p-1.5 text-center w-10 border-r border-slate-900">QTY</th>
                        <th className="p-1.5 text-right w-16 border-r border-slate-900">RATE (₹)</th>
                        <th className="p-1.5 text-right w-16 border-r border-slate-900">TAXABLE</th>
                        <th className="p-1.5 text-right w-16 border-r border-slate-900">CGST (9%)</th>
                        <th className="p-1.5 text-right w-16 border-r border-slate-900">SGST (9%)</th>
                        <th className="p-1.5 text-right w-20 font-black">TOTAL (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      {displayItems.map((itm, i) => {
                        const itmTotal = itm.total || (itm.unitPrice || 0) * (itm.quantity || 1);
                        const itmTaxable = itmTotal / 1.18;
                        const itmGst = itmTotal - itmTaxable;
                        const itmHalfGst = itmGst / 2;
                        const itmUnitRate = itm.unitPrice ? (itm.unitPrice / 1.18) : (itmTaxable / (itm.quantity || 1));
                        return (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="p-1.5 text-center font-bold text-slate-600 border-r border-slate-900">{i + 1}</td>
                            <td className="p-1.5 text-center font-mono border-r border-slate-900">{itm.hsn || "8525"}</td>
                            <td className="p-1.5 font-mono font-semibold border-r border-slate-900">{itm.sku}</td>
                            <td className="p-1.5 font-medium text-slate-900 border-r border-slate-900">
                              <div>{itm.title}</div>
                              {itm.unitBarcode && (
                                <div className="text-[8px] text-slate-500 font-mono">Unit Barcode: {itm.unitBarcode}</div>
                              )}
                            </td>
                            <td className="p-1.5 text-center font-bold border-r border-slate-900">{itm.quantity}</td>
                            <td className="p-1.5 text-right font-mono border-r border-slate-900">{itmUnitRate.toFixed(2)}</td>
                            <td className="p-1.5 text-right font-mono border-r border-slate-900">{itmTaxable.toFixed(2)}</td>
                            <td className="p-1.5 text-right font-mono border-r border-slate-900 text-slate-600">{itmHalfGst.toFixed(2)}</td>
                            <td className="p-1.5 text-right font-mono border-r border-slate-900 text-slate-600">{itmHalfGst.toFixed(2)}</td>
                            <td className="p-1.5 text-right font-mono font-bold text-slate-950">₹{itmTotal.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-100 font-black border-t-2 border-slate-900 text-[9px]">
                      <tr>
                        <td colSpan={4} className="p-1.5 border-r border-slate-900 text-left">
                          Totals: <strong>{displayItems.length} Item(s)</strong>
                        </td>
                        <td className="p-1.5 text-center border-r border-slate-900 font-black">
                          {displayItems.reduce((a, b) => a + b.quantity, 0)}
                        </td>
                        <td className="border-r border-slate-900"></td>
                        <td className="p-1.5 text-right font-mono border-r border-slate-900">₹{taxableValue.toFixed(2)}</td>
                        <td className="p-1.5 text-right font-mono border-r border-slate-900">₹{cgst.toFixed(2)}</td>
                        <td className="p-1.5 text-right font-mono border-r border-slate-900">₹{sgst.toFixed(2)}</td>
                        <td className="p-1.5 text-right font-mono font-black text-slate-950">₹{grandTotal.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* 3-COLUMN SETTLEMENT & TAX FOOTER */}
                <div className="grid grid-cols-[1.4fr_1fr_1.1fr] border-t-2 border-slate-900 text-[9px] bg-white">
                  {/* Left: Declaration & Bank */}
                  <div className="p-2.5 border-r-2 border-slate-900 leading-normal space-y-1.5">
                    <div>
                      <strong>Declaration:</strong> I/We hereby certify that goods/products mentioned in this invoice are warranted to be genuine and of standard quality.
                    </div>
                    <div className="border-t border-dashed border-slate-300 pt-1">
                      <strong>Amount in Words:</strong> <span className="font-semibold">{numberToWords(grandTotal)}</span>
                    </div>
                    <div className="border-t border-dashed border-slate-300 pt-1 text-slate-700">
                      <strong>Settlement Bank:</strong> {bankName} | <strong>A/C:</strong> <span className="font-mono font-bold">{bankAccount}</span> | <strong>IFSC:</strong> <span className="font-mono font-bold">{bankIfsc}</span>
                    </div>
                    <div className="text-[8px] text-slate-500">
                      <strong>Terms:</strong> Standard manufacturer warranty applies. Subject to Mumbai Jurisdiction. E.&O.E.
                    </div>
                  </div>

                  {/* Middle: Tax Analysis */}
                  <div className="p-2.5 border-r-2 border-slate-900 bg-slate-50/70 font-mono space-y-1 leading-normal">
                    <div className="flex justify-between">
                      <span>Taxable Value:</span> <strong>₹{taxableValue.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>CGST (9%):</span> <span>₹{cgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SGST (9%):</span> <span>₹{sgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-300 pt-1 font-bold">
                      <span>Total GST:</span> <span>₹{totalGst.toFixed(2)}</span>
                    </div>
                    <div className="text-[8px] font-sans text-slate-600 border-t border-slate-200 pt-1">
                      Reverse Charge: <strong>NO</strong> • Courier: <strong>{courierName}</strong>
                    </div>
                  </div>

                  {/* Right: Bill Amt & Signature */}
                  <div className="p-2.5 text-right space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between text-[8.5px] font-mono">
                        <span>Gross Taxable:</span> <span>₹{taxableValue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-[8.5px] font-mono">
                        <span>Add GST (18%):</span> <span>₹{totalGst.toFixed(2)}</span>
                      </div>
                      <div className="bg-slate-900 text-white p-1.5 rounded-xs flex justify-between items-center font-bold mt-1.5 shadow-xs">
                        <span className="text-[8.5px] tracking-wider">BILL AMT / TO PAY:</span>
                        <span className="font-mono text-xs font-black">₹{grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="pt-3 text-[8px]">
                      <div className="font-bold text-slate-900">For {sellerName}</div>
                      <div className="mt-3 pt-1 border-t border-slate-400 font-semibold text-slate-600 inline-block">
                        {signatoryName} ({signatoryDesignation})
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : (
            /* THERMAL LABEL PREVIEW */
            <div className="bg-slate-900 p-4 rounded-xl flex justify-center">
              <div className="bg-white text-black p-4 rounded-lg w-[320px] border border-black shadow-lg text-[10px] space-y-2">
                {/* Header */}
                <div className="flex justify-between items-center border-b border-black pb-1.5">
                  <div>
                    <div className="font-black text-xs">{courierName}</div>
                    <div className="bg-black text-white text-[9px] font-bold px-1.5 py-0.5 rounded inline-block mt-0.5">
                      {routing}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[10px]">
                      {isAmazon
                        ? "AMAZON.IN"
                        : isFlipkart
                        ? "FLIPKART"
                        : "DIRECT"}
                    </div>
                    <div className="border border-black px-1.5 py-0.5 rounded font-bold text-[9px] inline-block mt-0.5">
                      {data.paymentMethod || "PREPAID"}
                    </div>
                  </div>
                </div>

                {/* Tracking Barcode Placeholder */}
                <div className="text-center py-1 border-b border-black">
                  <div className="font-mono text-[9px]">AWB: {tracking}</div>
                  <div className="h-9 bg-slate-100 flex items-center justify-center font-mono font-bold tracking-widest text-xs border border-dashed border-slate-300 rounded">
                    ||||| |||| |||||| ||||||
                  </div>
                </div>

                {/* Order Ref */}
                <div className="flex justify-between text-[9px] font-mono border-b border-black pb-1">
                  <span>Order: #{data.orderId}</span>
                  <span>
                    Date:{" "}
                    {new Date(
                      data.orderDate || Date.now()
                    ).toLocaleDateString()}
                  </span>
                </div>

                {/* Addresses */}
                <div className="grid grid-cols-2 gap-2 text-[9px] border-b border-black pb-2">
                  <div>
                    <div className="font-bold text-[8px] uppercase text-slate-600">
                      DELIVER TO:
                    </div>
                    <div className="font-bold text-[10px]">
                      {data.buyerName}
                    </div>
                    <div className="truncate">{data.shippingAddress}</div>
                    <div className="border border-black px-1.5 py-0.5 font-black text-[11px] inline-block mt-1">
                      PIN: {data.pincode || "400001"}
                    </div>
                  </div>
                  <div className="border-l border-dashed border-slate-400 pl-2">
                    <div className="font-bold text-[8px] uppercase text-slate-600">
                      SOLD BY:
                    </div>
                    <div className="font-bold">{sellerName}</div>
                    <div className="text-[8px] text-slate-700">
                      GSTIN: {sellerGstin}
                    </div>
                    <div className="text-[8px] text-slate-700 mt-1">
                      Inv: {invoiceNum}
                    </div>
                  </div>
                </div>

                {/* Summary Items */}
                <div className="text-[8.5px]">
                  <div className="font-bold uppercase text-[8px] text-slate-700 mb-0.5">
                    PACKING SUMMARY:
                  </div>
                  {displayItems.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex justify-between truncate">
                      <span>
                        {item.quantity}x {item.title}
                      </span>
                      <span className="font-mono font-bold">
                        ₹
                        {(
                          item.total || item.unitPrice * item.quantity
                        ).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {displayItems.length > 3 && (
                    <div className="text-slate-500 italic text-[7.5px]">
                      +{displayItems.length - 3} more item(s)
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="flex justify-between items-center border-t border-black pt-1">
                  <div className="font-mono text-[8px]">INVOICE BARCODE</div>
                  <div className="text-right">
                    <div className="text-[11px] font-black">
                      ₹{grandTotal.toFixed(2)}
                    </div>
                    <div className="text-[7px] text-slate-600">
                      Includes 18% GST
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Customization Collapsible */}
          <div className="border border-[#cce7ed] rounded-xl p-3 bg-gradient-to-r from-slate-50 to-[#e3f2f5]/30">
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center justify-between w-full text-xs font-bold text-[#056468]"
            >
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Customise Business Profile, GSTIN & Bank Settlement Info</span>
              </span>
              <span className="text-[11px] font-semibold text-[#056468] hover:underline">
                {showSettings ? "Hide Settings ▲" : "Edit Details ▼"}
              </span>
            </button>

            {showSettings && (
              <div className="space-y-3 mt-3 pt-3 border-t border-[#cce7ed] text-xs">
                {settingsSavedToast && (
                  <div className="p-2 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Company & Invoice details saved permanently to system settings!</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Business / Brand Name:
                    </label>
                    <input
                      type="text"
                      value={sellerName}
                      onChange={(e) => setSellerName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      GSTIN Number:
                    </label>
                    <input
                      type="text"
                      value={sellerGstin}
                      onChange={(e) => setSellerGstin(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      PAN Number:
                    </label>
                    <input
                      type="text"
                      value={sellerPan}
                      onChange={(e) => setSellerPan(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Contact Phone:
                    </label>
                    <input
                      type="text"
                      value={sellerPhone}
                      onChange={(e) => setSellerPhone(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Billing Email:
                    </label>
                    <input
                      type="text"
                      value={sellerEmail}
                      onChange={(e) => setSellerEmail(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Website URL:
                    </label>
                    <input
                      type="text"
                      value={sellerWebsite}
                      onChange={(e) => setSellerWebsite(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Registered Business Address:
                    </label>
                    <input
                      type="text"
                      value={sellerAddress}
                      onChange={(e) => setSellerAddress(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Bank Name:
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Bank Account No:
                    </label>
                    <input
                      type="text"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      IFSC Code & Branch:
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      <input
                        type="text"
                        value={bankIfsc}
                        onChange={(e) => setBankIfsc(e.target.value)}
                        placeholder="IFSC"
                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono uppercase"
                      />
                      <input
                        type="text"
                        value={bankBranch}
                        onChange={(e) => setBankBranch(e.target.value)}
                        placeholder="Branch"
                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-600">
                        UPI ID / VPA Handler:
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showUpi}
                          onChange={(e) => setShowUpi(e.target.checked)}
                          className="rounded border-slate-300 text-[#056468] focus:ring-0 w-3 h-3 cursor-pointer"
                        />
                        <span className="text-[9.5px] font-bold text-[#056468]">
                          {showUpi ? "Print on Invoice" : "Hidden"}
                        </span>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={bankUpi}
                      onChange={(e) => setBankUpi(e.target.value)}
                      placeholder="e.g. stealthsight@hdfcbank"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Invoice & App Logo Path:
                    </label>
                    <input
                      type="text"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="/logo/1-01.png"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Authorized Signatory Name:
                    </label>
                    <input
                      type="text"
                      value={signatoryName}
                      onChange={(e) => setSignatoryName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Signatory Designation:
                    </label>
                    <input
                      type="text"
                      value={signatoryDesignation}
                      onChange={(e) => setSignatoryDesignation(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#cce7ed]">
                  <button
                    type="button"
                    onClick={handleSaveCompanyDetails}
                    disabled={savingSettings}
                    className="px-3.5 py-1.5 bg-[#056468] hover:bg-[#044e51] text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>{savingSettings ? "Saving Settings..." : "Save as Default Business Info"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 shrink-0">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <label className="font-bold text-slate-700">Copies:</label>
              <input
                type="number"
                min="1"
                max="10"
                value={copies}
                onChange={(e) =>
                  setCopies(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-14 px-2 py-1 rounded-lg border border-slate-200 font-mono font-bold text-center text-xs"
              />
            </div>

            {/* Database Registration Status / Button */}
            {isSavedInDb ? (
              <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Recorded in Invoices Tab (#{savedInvoiceNum || invoiceNum})</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  setSavingToDb(true);
                  try {
                    const res = await fetch("/api/invoices", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        orderId: data.orderDbId || data.orderId,
                        subtotal: taxableValue,
                        gstRate: 18,
                      }),
                    });
                    if (!res.ok) {
                      const err = await res.json();
                      throw new Error(err.error || "Failed to save invoice");
                    }
                    const newInv = await res.json();
                    setIsSavedInDb(true);
                    setSavedInvoiceNum(newInv.invoiceNumber);
                    if (onInvoiceSaved) onInvoiceSaved(newInv);
                    alert(`Invoice ${newInv.invoiceNumber} recorded successfully in the Invoices Tab!`);
                  } catch (e: any) {
                    alert(e.message || "Failed to record invoice");
                  } finally {
                    setSavingToDb(false);
                  }
                }}
                disabled={savingToDb}
                className="px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Permanently register this invoice in the Invoices Tab database"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>{savingToDb ? "Saving..." : "Save to Invoices Tab"}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#056468] hover:bg-[#045255] text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>
                {docMode === "A4_INVOICE"
                  ? a4Layout === "2_IN_1_DUAL"
                    ? "Print 2-in-1 Dual Invoice (Buyer + Seller)"
                    : "Print Full Page A4 Invoice"
                  : "Print 100×150mm Label"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
