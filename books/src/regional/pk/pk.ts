import { Fyo } from 'fyo';
import {
  pkFederalTaxRates,
  pkProvincialRates,
} from 'regional/pk';

/**
 * 🇵🇰 Pakistan Regional Records Creator
 *
 * Runs when a new company is created with Country = Pakistan.
 * Creates the default Tax templates used by FBR and provincial
 * tax authorities.
 *
 * - Federal GST: 17%, 18%, 10%, 5%, 0%
 * - Provincial Service Tax: PRA 16%, SRB 15%, KPRA 15%, BRA 15%
 */
export async function createPakistaniRecords(fyo: Fyo) {
  await createFederalTaxTemplates(fyo);
  await createProvincialTaxTemplates(fyo);
}

async function createFederalTaxTemplates(fyo: Fyo) {
  for (const rate of pkFederalTaxRates) {
    const name = `GST-${rate}`;
    await createTaxIfAbsent(fyo, name, rate);
  }
}

async function createProvincialTaxTemplates(fyo: Fyo) {
  for (const { code, rate } of pkProvincialRates) {
    const name = `${code}-${rate}`;
    await createTaxIfAbsent(fyo, name, rate);
  }
}

async function createTaxIfAbsent(fyo: Fyo, name: string, rate: number) {
  const exists = await fyo.db.exists('Tax', name);
  if (exists) {
    return;
  }

  const newTax = fyo.doc.getNewDoc('Tax', {
    name,
    details: [
      {
        account: 'Duties and Taxes',
        rate,
      },
    ],
  });

  await newTax.sync();
}