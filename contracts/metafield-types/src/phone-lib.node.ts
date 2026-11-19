import { createRequire } from 'node:module';
import type { PhoneLib } from './phone-lib.ts';

// Loaded on first use: the metadata costs a server about 6 MB it only needs once a phone number
// is read, which most never do.
const require = createRequire(import.meta.url);
let lib: PhoneLib | undefined;

export function phoneLib(): PhoneLib {
  if (!lib) {
    const max = require('libphonenumber-js/max') as Omit<PhoneLib, 'examples'>;
    lib = {
      getExampleNumber: max.getExampleNumber,
      isSupportedCountry: max.isSupportedCountry,
      parsePhoneNumberFromString: max.parsePhoneNumberFromString,
      validatePhoneNumberLength: max.validatePhoneNumberLength,
      examples: require('libphonenumber-js/mobile/examples') as PhoneLib['examples'],
    };
  }
  return lib;
}
