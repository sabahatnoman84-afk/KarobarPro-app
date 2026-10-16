import { SchemaStub } from 'schemas/types';
import IndianSchemas from './in';
import SwissSchemas from './ch';
import PakistaniSchemas from './pk';

/**
 * Regional Schemas are exported by country code.
 * Each entry adds country-specific fields to the base schemas.
 *
 * - `in` = India (GST, HSN, Place of Supply)
 * - `ch` = Switzerland (Tax ID)
 * - `pk` = Pakistan (NTN, STRN, CNIC, WhatsApp, JazzCash/EasyPaisa)
 */
export default {
  in: IndianSchemas,
  ch: SwissSchemas,
  pk: PakistaniSchemas,
} as Record<string, SchemaStub[]>;