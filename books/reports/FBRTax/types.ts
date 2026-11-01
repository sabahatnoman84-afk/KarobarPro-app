/**
 * 🇵🇰 FBR Sales Tax Types
 * 
 * Defines the data structure for the monthly FBR Sales Tax Return.
 * Based on the standard FBR format (Annexures A, B, C, and Summary).
 */

export interface FBRSummaryRow {
  label: string;
  taxableValue: number;
  taxAmount: number;
  isTotal?: boolean;
  isBold?: boolean;
  color?: 'green' | 'red';
}

export interface FBRInvoiceRow {
  name: string;
  date: string;
  party: string;
  ntnOrCnic: string;
  invoiceValue: number;
  taxableValue: number;
  taxRate: number;
  taxAmount: number;
  // Used to group by tax rate (e.g., 17%, 18%, 0%)
  rateGroup?: string;
}

export interface FBRReportData {
  // High-level summary (Net payable/refundable)
  summary: FBRSummaryRow[];
  
  // Annexure-C: Local Taxable Supplies (Sales)
  salesTaxable: FBRInvoiceRow[];
  
  // Annexure-D: Zero Rated / Exempt Supplies
  salesZeroRated: FBRInvoiceRow[];
  
  // Annexure-A/B: Input Tax (Purchases)
  purchasesTaxable: FBRInvoiceRow[];
}