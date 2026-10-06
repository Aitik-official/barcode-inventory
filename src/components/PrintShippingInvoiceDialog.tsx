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
      const itemsHtml = displayItems
        .map((item, idx) => {
          const itemTotal =
            item.total || (item.unitPrice || 0) * (item.quantity || 1);
          const itemTaxable = (itemTotal / 1.18).toFixed(2);
          const itemCgst = ((itemTotal - Number(itemTaxable)) / 2).toFixed(2);
          const itemSgst = itemCgst;
          return `
            <tr>
              <td style="padding: 6px 8px; text-align: center; border: 1px solid #cbd5e1; font-weight: 600;">${
                idx + 1
              }</td>
              <td style="padding: 6px 8px; border: 1px solid #cbd5e1;">
                <div style="font-weight: 700; color: #0f172a; font-size: 11px;">${
                  item.title
                }</div>
                <div style="font-family: monospace; font-size: 10px; color: #475569; margin-top: 1px;">
                  SKU: <strong>${item.sku}</strong>
                  ${
                    item.unitBarcode
                      ? ` &bull; Barcode: <strong>${item.unitBarcode}</strong>`
                      : ""
                  }
                  ${
                    item.asinOrFsn
                      ? ` &bull; ASIN/FSN: <strong>${item.asinOrFsn}</strong>`
                      : ""
                  }
                </div>
              </td>
              <td style="padding: 6px 8px; text-align: center; border: 1px solid #cbd5e1; font-family: monospace; font-size: 11px;">${
                item.hsn || "8525"
              }</td>
              <td style="padding: 6px 8px; text-align: center; border: 1px solid #cbd5e1; font-weight: 700; font-size: 11px;">${
                item.quantity
              }</td>
              <td style="padding: 6px 8px; text-align: right; border: 1px solid #cbd5e1; font-family: monospace; font-size: 11px;">₹${(
                item.unitPrice / 1.18
              ).toFixed(2)}</td>
              <td style="padding: 6px 8px; text-align: right; border: 1px solid #cbd5e1; font-family: monospace; font-size: 11px;">₹${itemTaxable}</td>
              <td style="padding: 6px 8px; text-align: right; border: 1px solid #cbd5e1; font-family: monospace; font-size: 10px;">
                9% (₹${itemCgst})
              </td>
              <td style="padding: 6px 8px; text-align: right; border: 1px solid #cbd5e1; font-family: monospace; font-size: 10px;">
                9% (₹${itemSgst})
              </td>
              <td style="padding: 6px 8px; text-align: right; border: 1px solid #cbd5e1; font-family: monospace; font-weight: 700; font-size: 11px; color: #0f172a;">₹${itemTotal.toFixed(
                2
              )}</td>
            </tr>
          `;
        })
        .join("");

      const pagesHtml = Array(copies)
        .fill(null)
        .map(
          (_, pageIdx) => `
        <div class="a4-page">
          <!-- TOP HEADER -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #056468; padding-bottom: 8px;">
            <div style="max-width: 62%;">
              ${logoUrl ? `<div style="margin-bottom: 4px;"><img src="${logoUrl}" alt="Logo" style="max-height: 34px; max-width: 140px; object-fit: contain; display: block;" onerror="this.style.display='none'" /></div>` : ""}
              <div style="font-size: 18px; font-weight: 900; color: #056468; letter-spacing: -0.4px; line-height: 1.2;">${sellerName}</div>
              ${sellerTagline ? `<div style="font-size: 9px; font-weight: 700; color: #475569; margin-top: 1px; margin-bottom: 2px;">${sellerTagline}</div>` : ""}
              <div style="font-size: 9px; color: #334155; margin-top: 2px; max-width: 440px; line-height: 1.35;">
                ${sellerAddress}<br/>
                Tel: <strong>${sellerPhone}</strong> | Email: <strong>${sellerEmail}</strong>
              </div>
              <div style="margin-top: 3px; font-size: 9px; color: #0f172a; font-weight: 700;">
                GSTIN: <span style="font-family: monospace; font-size: 10px; color: #056468;">${sellerGstin}</span> | State: <strong>${sellerStateName}</strong> | PAN: <span style="font-family: monospace;">${sellerPan}</span>
              </div>
            </div>
            <div style="text-align: right; min-width: 160px;">
              <div style="background: #056468; color: #fff; display: inline-block; padding: 3px 10px; font-weight: 800; font-size: 12px; border-radius: 4px; letter-spacing: 0.5px;">
                TAX INVOICE
              </div>
              <div style="font-size: 9px; font-weight: 700; color: #64748b; margin-top: 3px; text-transform: uppercase;">
                Original for Recipient
              </div>
              <div style="margin-top: 6px; font-size: 10.5px; line-height: 1.4;">
                <strong>Invoice #:</strong> <span style="font-family: monospace; font-weight: 700; color: #056468;">${invoiceNum}</span><br/>
                <strong>Invoice Date:</strong> ${new Date(
                  data.invoiceDate || Date.now()
                ).toLocaleDateString("en-IN")}<br/>
                <strong>Order Ref:</strong> #${data.orderId}
              </div>
            </div>
          </div>

          <!-- META GRID: BILL TO / SHIP TO / ORDER DETAILS -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 10px 0; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; background: #f8fafc; font-size: 10px; line-height: 1.4;">
            <div>
              <div style="font-weight: 800; color: #056468; text-transform: uppercase; font-size: 9px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; margin-bottom: 3px;">
                Billed To (Customer Details):
              </div>
              <div style="font-size: 12px; font-weight: 800; color: #0f172a;">${
                data.buyerName
              }</div>
              <div style="color: #475569;">
                ${data.shippingAddress}<br/>
                ${
                  data.city
                    ? `${data.city}, ${data.state || ""} - ${
                        data.pincode || ""
                      }`
                    : ""
                }
              </div>
              ${
                data.buyerPhone
                  ? `<div>Contact: <strong>${data.buyerPhone}</strong></div>`
                  : ""
              }
              ${
                data.buyerEmail
                  ? `<div>Email: <strong>${data.buyerEmail}</strong></div>`
                  : ""
              }
              <div>Place of Supply: <strong>${
                data.state || "Maharashtra (27)"
              }</strong></div>
            </div>

            <div>
              <div style="font-weight: 800; color: #056468; text-transform: uppercase; font-size: 9px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; margin-bottom: 3px;">
                Dispatch & Transport Details:
              </div>
              <div>Channel: <strong>${
                data.channel || "DIRECT DISPATCH"
              }</strong></div>
              <div>Courier / Transporter: <strong>${courierName}</strong></div>
              <div>AWB / Tracking Number: <strong style="font-family: monospace;">${tracking}</strong></div>
              <div>Payment Mode: <strong style="color: #056468;">${
                data.paymentMethod || "PREPAID"
              }</strong></div>
              <div>Reverse Charge Applicable: <strong>NO</strong></div>
            </div>
          </div>

          <!-- TABLE OF GOODS -->
          <table style="width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 10px;">
            <thead>
              <tr style="background: #056468; color: #ffffff;">
                <th style="padding: 6px; border: 1px solid #056468; width: 30px;">#</th>
                <th style="padding: 6px; border: 1px solid #056468; text-align: left;">Item Description & Specifications</th>
                <th style="padding: 6px; border: 1px solid #056468; text-align: center; width: 50px;">HSN</th>
                <th style="padding: 6px; border: 1px solid #056468; text-align: center; width: 40px;">Qty</th>
                <th style="padding: 6px; border: 1px solid #056468; text-align: right; width: 65px;">Unit Rate</th>
                <th style="padding: 6px; border: 1px solid #056468; text-align: right; width: 70px;">Taxable</th>
                <th style="padding: 6px; border: 1px solid #056468; text-align: right; width: 65px;">CGST (9%)</th>
                <th style="padding: 6px; border: 1px solid #056468; text-align: right; width: 65px;">SGST (9%)</th>
                <th style="padding: 6px; border: 1px solid #056468; text-align: right; width: 75px;">Total (INR)</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr style="background: #f1f5f9; font-weight: 800;">
                <td colspan="3" style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">Total / Summary:</td>
                <td style="padding: 6px; text-align: center; border: 1px solid #cbd5e1;">${displayItems.reduce(
                  (a, b) => a + b.quantity,
                  0
                )}</td>
                <td style="border: 1px solid #cbd5e1;"></td>
                <td style="padding: 6px; text-align: right; border: 1px solid #cbd5e1; font-family: monospace;">₹${taxableValue.toFixed(
                  2
                )}</td>
                <td style="padding: 6px; text-align: right; border: 1px solid #cbd5e1; font-family: monospace;">₹${cgst.toFixed(
                  2
                )}</td>
                <td style="padding: 6px; text-align: right; border: 1px solid #cbd5e1; font-family: monospace;">₹${sgst.toFixed(
                  2
                )}</td>
                <td style="padding: 6px; text-align: right; border: 1px solid #cbd5e1; font-family: monospace; font-size: 11px; color: #056468;">₹${grandTotal.toFixed(
                  2
                )}</td>
              </tr>
            </tfoot>
          </table>

          <!-- TOTAL IN WORDS & SUMMARY BOX -->
          <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 12px; margin-top: 10px;">
            <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; background: #fff; font-size: 9.5px;">
              <div style="margin-bottom: 6px;">
                <strong style="color: #056468;">Amount in Words:</strong><br/>
                <span style="font-weight: 700; color: #0f172a;">${numberToWords(
                  grandTotal
                )}</span>
              </div>
              <div style="border-top: 1px dashed #cbd5e1; padding-top: 6px; font-size: 9px; color: #475569; line-height: 1.4;">
                <strong style="color: #056468;">Bank & Payment Details for Settlement:</strong><br/>
                Bank: <strong>${bankName}</strong> | Branch: <strong>${bankBranch}</strong><br/>
                A/C No: <strong style="font-family: monospace; font-size: 10px; color: #0f172a;">${bankAccount}</strong> | IFSC: <strong style="font-family: monospace; font-size: 10px; color: #0f172a;">${bankIfsc}</strong>
                ${showUpi && bankUpi ? `<br/>UPI ID / VPA: <strong style="font-family: monospace; color: #056468;">${bankUpi}</strong>` : ""}
              </div>
              <div style="border-top: 1px dashed #cbd5e1; margin-top: 6px; padding-top: 4px; font-size: 8px; color: #64748b; line-height: 1.35;">
                <strong style="color: #334155;">Terms & Conditions:</strong> ${invoiceTerms.replace(/\n/g, "<br/>")}
              </div>
            </div>

            <!-- SUMMARY AMOUNTS -->
            <div style="border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; background: #f8fafc; font-size: 10px; line-height: 1.5;">
              <div style="display: flex; justify-content: space-between;">
                <span>Total Taxable Value:</span>
                <span style="font-family: monospace; font-weight: 600;">₹${taxableValue.toFixed(
                  2
                )}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Central GST (CGST 9%):</span>
                <span style="font-family: monospace;">₹${cgst.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>State GST (SGST 9%):</span>
                <span style="font-family: monospace;">₹${sgst.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-top: 1.5px solid #056468; padding-top: 4px; margin-top: 4px; font-size: 12px; font-weight: 900; color: #056468;">
                <span>Grand Total:</span>
                <span style="font-family: monospace;">₹${grandTotal.toFixed(
                  2
                )}</span>
              </div>
              <div style="text-align: right; margin-top: 18px;">
                <div style="font-size: 9px; font-weight: 800; color: #0f172a;">For ${sellerName}</div>
                <div style="margin-top: 18px; font-size: 8.5px; color: #475569; border-top: 1px solid #94a3b8; display: inline-block; padding-top: 2px;">
                  <strong>${signatoryName}</strong><br/>
                  <span style="font-size: 7.5px; color: #64748b;">${signatoryDesignation}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- FOOTER NOTE -->
          <div style="text-align: center; margin-top: 12px; font-size: 8px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 4px;">
            This is a computer-generated GST Tax Invoice created via BarcodeZAA ERP.
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
                margin: 8mm;
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
                padding: 4mm;
                page-break-after: always;
                break-after: page;
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
          {/* Live Document Preview Container */}
          {docMode === "A4_INVOICE" ? (
            <div className="bg-slate-50 border border-slate-300 rounded-xl p-5 text-xs shadow-inner space-y-4 font-sans">
              {/* Top Seller & Invoice Header */}
              <div className="flex justify-between items-start border-b-2 border-[#056468] pb-3">
                <div className="max-w-[65%]">
                  {logoUrl && (
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="h-7 max-h-7 max-w-[130px] object-contain mb-1.5 block"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  )}
                  <h4 className="text-lg font-black text-[#056468] tracking-tight leading-tight">
                    {sellerName}
                  </h4>
                  {sellerTagline && (
                    <p className="text-[10px] font-semibold text-slate-600 mt-0.5">
                      {sellerTagline}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-600 mt-1 max-w-sm leading-tight">
                    {sellerAddress}
                  </p>
                  <p className="text-[10px] text-slate-800 font-medium mt-1">
                    GSTIN:{" "}
                    <span className="font-mono font-bold text-[#056468]">
                      {sellerGstin}
                    </span>{" "}
                    • State: <strong>{sellerStateName}</strong> • PAN:{" "}
                    <span className="font-mono font-bold">{sellerPan}</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="px-3 py-1 bg-[#056468] text-white font-bold text-xs rounded uppercase tracking-wider">
                    TAX INVOICE
                  </span>
                  <div className="mt-2 text-[11px] font-mono leading-tight">
                    <div>
                      Inv: <strong>{invoiceNum}</strong>
                    </div>
                    <div>
                      Date:{" "}
                      {new Date(
                        data.invoiceDate || Date.now()
                      ).toLocaleDateString("en-IN")}
                    </div>
                    <div>
                      Order: <strong>#{data.orderId}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bill to & Ship To Grid */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-white rounded-lg border border-slate-200 text-[11px]">
                <div>
                  <div className="text-[10px] font-bold text-[#056468] uppercase border-b border-slate-100 pb-1 mb-1">
                    Bill & Ship To (Buyer):
                  </div>
                  <div className="font-bold text-slate-900 text-sm">
                    {data.buyerName}
                  </div>
                  <div className="text-slate-600">{data.shippingAddress}</div>
                  <div className="font-bold text-[#056468] mt-1">
                    PIN: {data.pincode || "400001"} • {data.state || "India"}
                  </div>
                  {data.buyerPhone && (
                    <div className="text-slate-500">Tel: {data.buyerPhone}</div>
                  )}
                </div>

                <div>
                  <div className="text-[10px] font-bold text-[#056468] uppercase border-b border-slate-100 pb-1 mb-1">
                    Fulfillment & Dispatch Details:
                  </div>
                  <div>
                    Channel:{" "}
                    <strong className="text-slate-900">
                      {data.channel || "DIRECT DISPATCH"}
                    </strong>
                  </div>
                  <div>
                    Courier:{" "}
                    <strong className="text-slate-900">{courierName}</strong>
                  </div>
                  <div>
                    AWB Tracking:{" "}
                    <strong className="font-mono text-slate-900">
                      {tracking}
                    </strong>
                  </div>
                  <div>
                    Payment Status:{" "}
                    <strong className="text-emerald-700">
                      {data.paymentMethod || "PREPAID"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Product Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f0f8fa] text-[#0b252c] font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 w-8">#</th>
                      <th className="p-2.5">Item Description</th>
                      <th className="p-2.5 text-center">HSN</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Taxable</th>
                      <th className="p-2.5 text-right">GST (18%)</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-normal">
                    {displayItems.map((itm, i) => {
                      const itmTotal =
                        itm.total ||
                        (itm.unitPrice || 0) * (itm.quantity || 1);
                      const itmTaxable = (itmTotal / 1.18).toFixed(2);
                      const itmGst = (itmTotal - Number(itmTaxable)).toFixed(2);
                      return (
                        <tr key={i} className="hover:bg-slate-50/70">
                          <td className="p-2.5 font-bold text-slate-500">
                            {i + 1}
                          </td>
                          <td className="p-2.5 font-medium text-slate-900">
                            <div>{itm.title}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              SKU: {itm.sku}{" "}
                              {itm.unitBarcode
                                ? `• Unit: ${itm.unitBarcode}`
                                : ""}
                            </div>
                          </td>
                          <td className="p-2.5 text-center font-mono text-[11px]">
                            {itm.hsn || "8525"}
                          </td>
                          <td className="p-2.5 text-center font-bold">
                            {itm.quantity}
                          </td>
                          <td className="p-2.5 text-right font-mono">
                            ₹{itmTaxable}
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-600">
                            ₹{itmGst}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-[#056468]">
                            ₹{itmTotal.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={4} className="p-2.5 text-right">
                        Summary Total:
                      </td>
                      <td className="p-2.5 text-right font-mono">
                        ₹{taxableValue.toFixed(2)}
                      </td>
                      <td className="p-2.5 text-right font-mono">
                        ₹{totalGst.toFixed(2)}
                      </td>
                      <td className="p-2.5 text-right font-mono text-sm text-[#056468]">
                        ₹{grandTotal.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Bank & Signatory Footer */}
              <div className="p-3 bg-white rounded-lg border border-slate-200 flex flex-col sm:flex-row justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold uppercase">
                    Amount in Words:
                  </span>
                  <div className="font-bold text-slate-900 text-[11px]">
                    {numberToWords(grandTotal)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Bank: <strong>{bankName}</strong> • A/C:{" "}
                    <strong>{bankAccount}</strong> • IFSC:{" "}
                    <strong>{bankIfsc}</strong> • Branch: <strong>{bankBranch}</strong>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-slate-500 text-[10px]">
                    {signatoryDesignation || "Authorized Signatory"}
                  </div>
                  <div className="font-bold text-[#056468] text-xs mt-3">
                    {signatoryName ? `${signatoryName} (For ${sellerName})` : `For ${sellerName}`}
                  </div>
                </div>
              </div>
            </div>
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
                  ? "Print A4 GST Tax Invoice"
                  : "Print 100×150mm Label"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
