// The full metadata, so a valid number is one a country has given out rather than one of the right
// length, as the default metadata would have it.
import {
  getExampleNumber,
  isSupportedCountry,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
} from 'libphonenumber-js/max';
import examples from 'libphonenumber-js/mobile/examples';

/**
 * The parts of libphonenumber-js the phone rules use. Resolved through `#phone-lib`: a bundle gets
 * this file, which loads the library up front, and Node gets `phone-lib.node.ts`, which loads it on
 * first use, so a server that never reads a phone number doesn't hold its metadata.
 */
export interface PhoneLib {
  getExampleNumber: typeof getExampleNumber;
  isSupportedCountry: typeof isSupportedCountry;
  parsePhoneNumberFromString: typeof parsePhoneNumberFromString;
  validatePhoneNumberLength: typeof validatePhoneNumberLength;
  examples: typeof examples;
}

const lib: PhoneLib = {
  getExampleNumber,
  isSupportedCountry,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
  examples,
};

export const phoneLib = (): PhoneLib => lib;
