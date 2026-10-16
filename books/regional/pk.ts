/**
 * 🇵🇰 Pakistan Regional Data
 *
 * Provinces, cities, and tax rates used across the app for Pakistan.
 * This file is imported by:
 * - Address model (for provinces dropdown)
 * - Setup wizard (for tax template defaults)
 * - Tax templates creator (src/regional/pk/pk.ts)
 */

/**
 * List of Pakistani provinces and territories.
 * Used for the "State" dropdown when Country = Pakistan.
 */
export const pkProvinces = [
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Islamabad Capital Territory',
  'Gilgit-Baltistan',
  'Azad Jammu and Kashmir',
] as const;

/**
 * ISO 3166-2:PK codes → Province names.
 * Useful for future integrations (FBR e-filing, province-specific reporting).
 */
export const pkProvinceMap = {
  'PK-PB': 'Punjab',
  'PK-SD': 'Sindh',
  'PK-KP': 'Khyber Pakhtunkhwa',
  'PK-BA': 'Balochistan',
  'PK-IS': 'Islamabad Capital Territory',
  'PK-GB': 'Gilgit-Baltistan',
  'PK-JK': 'Azad Jammu and Kashmir',
} as Record<string, string>;

/**
 * Federal GST rates for goods (FBR).
 * Standard: 17%. Reduced rates for specific goods. 0% for exports/exempt.
 */
export const pkFederalTaxRates = [17, 18, 10, 5, 0] as const;

/**
 * Provincial Sales Tax on Services (only applies to service businesses).
 * Rates effective 2025-2026.
 */
export const pkProvincialRates = [
  { code: 'PRA', rate: 16, label: 'Punjab Revenue Authority' },
  { code: 'SRB', rate: 15, label: 'Sindh Revenue Board' },
  { code: 'KPRA', rate: 15, label: 'Khyber Pakhtunkhwa Revenue Authority' },
  { code: 'BRA', rate: 15, label: 'Balochistan Revenue Authority' },
] as const;

/**
 * Default fiscal year for Pakistan: July 1 → June 30.
 * Used by the Setup Wizard to auto-fill fiscal year dates.
 */
export const pkFiscalYear = {
  startMonth: 7, // July
  startDay: 1,
  endMonth: 6, // June
  endDay: 30,
} as const;