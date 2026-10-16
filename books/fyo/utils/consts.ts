export const DEFAULT_INTERNAL_PRECISION = 11;
export const DEFAULT_DISPLAY_PRECISION = 2;
export const DEFAULT_DATE_FORMAT = 'MMM d, y';
export const DEFAULT_LOCALE = 'en-IN';
export const DEFAULT_COUNTRY_CODE = 'in';
export const DEFAULT_CURRENCY = 'INR';
export const DEFAULT_LANGUAGE = 'English';
export const DEFAULT_SERIES_START = 1001;
export const DEFAULT_USER = 'Admin';

/**
 * Languages that use right-to-left (RTL) text direction.
 * Names must match the keys in `languageCodeMap` (src/utils/language.ts).
 */
export const RTL_LANGUAGES = [
  'Arabic',
  'Aramaic',
  'Dhivehi',
  'Hebrew',
  'Kurdish',
  'Sorani',
  'Persian',
  'Urdu',
  // 🇵🇰 Pakistan regional languages (RTL)
  'Sindhi',
  'Punjabi',
];