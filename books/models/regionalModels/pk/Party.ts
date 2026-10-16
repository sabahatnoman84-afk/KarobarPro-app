import { HiddenMap } from 'fyo/model/types';
import { Party as BaseParty } from 'models/baseModels/Party/Party';

/**
 * 🇵🇰 Pakistan Party Model
 *
 * Extends the base Party model with Pakistan-specific fields:
 * - CNIC (National ID card)
 * - NTN (National Tax Number)
 * - STRN (Sales Tax Registration Number)
 * - WhatsApp Number (for Khata payment reminders)
 *
 * Also customizes field visibility based on party role
 * (e.g., Customers see WhatsApp field, Suppliers don't need CNIC-based loyalty).
 */
export class Party extends BaseParty {
  cnic?: string;
  ntn?: string;
  strn?: string;
  whatsappNumber?: string;

  hidden: HiddenMap = {
    cnic: () => false,
    ntn: () => false,
    strn: () => false,
    whatsappNumber: () => false,

    // Hide loyalty program fields for suppliers (base behavior)
    loyaltyProgram: () => {
      if (!this.fyo.singles.AccountingSettings?.enableLoyaltyProgram) {
        return true;
      }
      return this.role === 'Supplier';
    },
    loyaltyPoints: () => !this.loyaltyProgram || this.role === 'Supplier',
  };
}