import { ListsMap } from 'fyo/model/types';
import { Address as BaseAddress } from 'models/baseModels/Address/Address';
import { pkProvinces } from 'regional/pk';

/**
 * 🇵🇰 Pakistan Address Model
 *
 * Extends the base Address model so that when the country is "Pakistan",
 * the "State" dropdown returns Pakistani provinces instead of the default
 * (empty) list.
 */
export class Address extends BaseAddress {
  static lists: ListsMap = {
    ...BaseAddress.lists,

    state(doc) {
      const country = doc?.country as string | undefined;

      if (country === 'Pakistan') {
        return [...pkProvinces];
      }

      return BaseAddress.lists.state?.(doc) ?? [];
    },
  };
}