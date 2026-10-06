export interface CompanySettingsData {
  id?: string;
  companyName: string;
  tagline: string;
  gstin: string;
  pan: string;
  cin: string;
  email: string;
  phone: string;
  alternatePhone: string;
  website: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  country: string;

  // Bank Details
  bankName: string;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  branch: string;
  upiId: string;
  showUpi: boolean;

  // Invoice Options
  invoicePrefix: string;
  invoiceTerms: string;
  footerNote: string;
  authorizedSignatory: string;
  signatoryDesignation: string;
  logoUrl: string;
  signatureUrl: string;
  updatedAt?: string | Date;
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettingsData = {
  companyName: "Stealth Sight Inventory",
  tagline: "Professional Barcode, Thermal Labeling & Warehouse Logistics Systems",
  gstin: "27AABCU9603R1ZN",
  pan: "AABCU9603R",
  cin: "U72900MH2024PTC123456",
  email: "billing@stealthsight.com",
  phone: "+91 98200 12345",
  alternatePhone: "+91 98200 67890",
  website: "www.stealthsight.com",
  addressLine1: "Industrial Hub, Unit 4B, MIDC Industrial Area",
  addressLine2: "Opp. Seepz Gate No. 1, Andheri East",
  city: "Mumbai",
  state: "Maharashtra",
  stateCode: "27",
  pincode: "400093",
  country: "India",

  // Bank Details
  bankName: "HDFC Bank",
  accountName: "Stealth Sight Inventory Pvt Ltd",
  accountNumber: "50200012345678",
  ifscCode: "HDFC0001234",
  branch: "MIDC Andheri East Branch, Mumbai",
  upiId: "stealthsight@hdfcbank",
  showUpi: true,

  // Invoice Options
  invoicePrefix: "INV-2026-",
  invoiceTerms:
    "1. Goods once sold will not be accepted back or exchanged without prior approval.\n2. Payment is due within the agreed credit period. Interest @ 18% p.a. will be levied on delayed payments.\n3. All disputes are subject to Mumbai Jurisdiction only.\n4. Certified that the particulars given above are true and correct.",
  footerNote:
    "Thank you for choosing Stealth Sight Inventory! For billing queries, email billing@stealthsight.com",
  authorizedSignatory: "Rushabh Gandhi",
  signatoryDesignation: "Managing Director / Authorized Signatory",
  logoUrl: "/logo/1-01.png",
  signatureUrl: "",
};
