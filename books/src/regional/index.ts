import { Fyo } from 'fyo';
import { createIndianRecords } from './in/in';
import { createPakistaniRecords } from './pk/pk';

/**
 * Creates country-specific records (tax templates, regional data)
 * when a new company is set up.
 *
 * - India: GST, IGST, Exempt-GST, Exempt-IGST templates
 * - Pakistan: Federal GST + Provincial Service Tax templates
 *
 * Add new countries here as regional modules are built.
 */
export async function createRegionalRecords(country: string, fyo: Fyo) {
  if (country === 'India') {
    await createIndianRecords(fyo);
  } else if (country === 'Pakistan') {
    await createPakistaniRecords(fyo);
  }

  return;
}