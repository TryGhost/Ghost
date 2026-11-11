import { describe, it, assert } from 'vitest';
import { createRequire } from 'node:module';
import {
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
  parsePhoneNumber,
} from 'libphonenumber-js';
import examples from 'libphonenumber-js/mobile/examples';
import { valueSchemaFor } from '../src/index.ts';
import {
  CALLING_CODES,
  INTERNATIONAL_PREFIXES,
  SHARED_CODES,
  flagOf,
  holdNumber,
  isPhoneCountry,
  phoneCountryOfLocales,
  phoneCountryOptions,
  pickCountry,
  readCallingCode,
  shownCountry,
  startPhoneEntry,
  typeNumber,
  withCallingCode,
} from '../src/phone.ts';

describe('phone numbers in a browser', function () {
  // Copied so a browser app can offer the codes without the library, and so liable to drift
  // when the library is upgraded.
  it("offers every country the rules know, by the rules' calling code", function () {
    const known = Object.fromEntries(
      getCountries().map((country) => [country, getCountryCallingCode(country)]),
    );
    assert.deepEqual({ ...CALLING_CODES }, known);
  });

  it('sends a number typed without its country code with the chosen country’s', function () {
    const rule = valueSchemaFor({ type: 'phone' });
    assert.equal(withCallingCode('07400 123456', 'GB'), '+44 07400 123456');
    assert.equal(rule.parse(withCallingCode('07400 123456', 'GB')), '+447400123456');
    assert.equal(rule.parse(withCallingCode('(415) 555-0100', 'US')), '+14155550100');
  });

  it('keeps the country code a number was typed with, whichever country is chosen', function () {
    assert.equal(withCallingCode(' +33 6 12 34 56 78 ', 'GB'), '+33 6 12 34 56 78');
  });

  it('sends nothing for nothing typed, so the field is cleared', function () {
    assert.equal(withCallingCode('  ', 'GB'), '');
  });

  it('reads the 00 most countries dial abroad with as a +', function () {
    assert.equal(withCallingCode('0044 20 7946 0000', 'FR'), '+44 20 7946 0000');
    assert.equal(readCallingCode('0044 20 7946 0000')?.country, 'GB');
  });

  // Only the way of dialling abroad becomes the +, and what follows stays as written, so the site
  // refuses an extension rather than reading its digits as more of the number.
  it('keeps what follows a way of dialling abroad as written', function () {
    const rule = valueSchemaFor({ type: 'phone' });
    for (const country of ['DE', 'US'] as const) {
      const sent = withCallingCode('0049 30 123456 ext. 789', country);
      assert.equal(sent, '+49 30 123456 ext. 789');
      assert.equal(
        rule.safeParse(sent).error?.issues[0]?.message,
        'Enter the phone number without an extension.',
      );
    }
    assert.equal(withCallingCode('011 49 30 123456 x 789', 'US'), '+49 30 123456 x 789');
    // The separators between the way of dialling abroad and the code go with it.
    assert.equal(withCallingCode('(011) 44 20 7946 0000', 'US'), '+44 20 7946 0000');
    assert.equal(withCallingCode('00-44-20-7946-0000', 'FR'), '+44-20-7946-0000');
    // Text before it isn't a way of dialling abroad, so it stays, for the site to refuse.
    const typedAfterText = withCallingCode('abc011 44 20 7946 0000', 'US');
    assert.equal(typedAfterText, '+1 abc011 44 20 7946 0000');
    assert.equal(rule.safeParse(typedAfterText).success, false);
  });

  // For the site to say what it needs, rather than a code nobody chose.
  it('sends a number written without a code as written when no country is shown', function () {
    assert.equal(withCallingCode('020 7946 0000', undefined), '020 7946 0000');
  });

  it('reads the country a number names by its calling code', function () {
    assert.deepEqual(readCallingCode('+447400123456'), {
      country: 'GB',
      callingCode: '44',
      rest: '7400123456',
    });
    // A code countries share names the one it is taken to mean.
    assert.equal(readCallingCode('+1 415 555 0100')?.country, 'US');
    // The longest code that names a country: +35 is none, +358 is Finland's.
    assert.equal(readCallingCode('+358 40 123 4567')?.country, 'FI');
    assert.equal(readCallingCode('07400 123456'), undefined);
    assert.equal(readCallingCode('+999 123'), undefined);
  });

  // Several countries share +1 and +44, so a number written with its code shows the country its
  // own digits are from. Until they say, the one picked stands while the code is its own.
  it('shows the country a number is from, else the one picked while the code is its own', function () {
    // A Toronto number is Canadian and a New York one American, whichever was picked.
    assert.equal(shownCountry('+1 416 555 0100', 'US'), 'CA');
    assert.equal(shownCountry('+1 212 555 0100', 'CA'), 'US');
    // Written as it is dialled at home, it keeps the country picked, as Stripe Checkout does.
    assert.equal(shownCountry('416 555 0100', 'US'), 'US');
    assert.equal(shownCountry('07624 123456', 'GB'), 'GB');
    // Part way through typing, the digits don't say yet.
    assert.equal(shownCountry('+1 41', 'CA'), 'CA');
    assert.equal(shownCountry('+1 41', undefined), 'US');
    // An Isle of Man mobile, with or without the national 0 after its code.
    assert.equal(shownCountry('+44 7624 123456', 'GB'), 'IM');
    assert.equal(shownCountry('+44 07624 123456', 'GB'), 'IM');
    assert.equal(shownCountry('+33 6 12 34 56 78', 'GB'), 'FR');
    assert.equal(shownCountry('07400 123456', 'GB'), 'GB');
  });

  it('offers the countries a number can be from, each with its code', function () {
    assert.deepEqual(
      phoneCountryOptions([
        { value: 'AQ', label: 'Antarctica' },
        { value: 'GB', label: 'United Kingdom' },
      ]),
      [{ value: 'GB', label: 'United Kingdom +44' }],
    );
  });

  // The way a country dials abroad, which libphonenumber-js reads too, so 011 44 from the US is +44.
  it('reads a number written the way its country dials abroad as one with its code', function () {
    assert.equal(withCallingCode('011 44 20 7946 0000', 'US'), '+44 20 7946 0000');
    assert.equal(withCallingCode('0011 44 20 7946 0000', 'AU'), '+44 20 7946 0000');
    assert.equal(shownCountry('011 44 20 7946 0000', 'US'), 'GB');
  });

  // As typed into an input with that country picked, not only as each helper reads it.
  it('sends a number written the way the picked country dials abroad with its own code', function () {
    const typed = (text: string, locale: string) =>
      typeNumber(startPhoneEntry('', [locale]), text).number;
    assert.equal(typed('011 44 20 7946 0000', 'en-US'), '+44 20 7946 0000');
    assert.equal(typed('0011 44 20 7946 0000', 'en-AU'), '+44 20 7946 0000');
    assert.equal(typed('810 44 20 7946 0000', 'ru-RU'), '+44 20 7946 0000');
    assert.equal(typed('00 44 20 7946 0000', 'en-US'), '+44 20 7946 0000');
  });

  it('reads a code written with spaces after its +', function () {
    assert.equal(shownCountry('+ 44 20 7946 0000', undefined), 'GB');
    assert.equal(shownCountry('00 44 20 7946 0000', 'US'), 'GB');
  });

  it('puts no code in front of text that is no number', function () {
    assert.equal(withCallingCode('n/a', 'GB'), 'n/a');
  });

  it('shows no country for a code no country has', function () {
    assert.equal(shownCountry('+999 123', 'FR'), undefined);
  });

  // A member whose number is held from abroad rewrites it as dialled at home there, whatever
  // language their browser speaks.
  it("starts from the country of the number held, else the reader's", function () {
    // Shown after the code its country already shows, as a number typed beside it is.
    assert.deepEqual(startPhoneEntry('+447400123456', ['en-US']), {
      typed: '7400123456',
      picked: 'GB',
    });
    // Sent as it shows, it is the number held.
    const held = startPhoneEntry('+447400123456', ['en-US']);
    assert.equal(typeNumber(held, held.typed).number, '+44 7400123456');
    assert.deepEqual(startPhoneEntry('', ['en-US']), { typed: '', picked: 'US' });
    // A number on a code several countries share is from the country its digits place it in,
    // whoever reads it.
    assert.equal(startPhoneEntry('+14165550100', ['en-GB']).picked, 'CA');
    assert.equal(startPhoneEntry('+12125550100', ['en-CA']).picked, 'US');
    assert.equal(startPhoneEntry('+447624123456', ['en-GB']).picked, 'IM');
    // Where its digits don't say, it's taken to be the reader's own where the code is theirs.
    assert.equal(startPhoneEntry('+1 999', ['en-CA']).picked, 'CA');
    assert.equal(startPhoneEntry('+1 999', ['en-GB']).picked, 'US');
    const rewritten = typeNumber(startPhoneEntry('+447400123456', ['en-US']), '07400 123457');
    assert.equal(rewritten.number, '+44 07400 123457');
  });

  // Such as the number the site kept after a save, which says which country it is from.
  it('takes the country of a number that replaces what was typed', function () {
    const picked = typeNumber(startPhoneEntry('', ['en-US']), '415 555 0100').entry;
    assert.deepEqual(holdNumber(picked, '+442079460000'), {
      typed: '2079460000',
      picked: 'GB',
    });
    // A number with a code no country has is shown as held.
    assert.deepEqual(holdNumber(picked, '+999 123'), { typed: '+999 123', picked: 'US' });
    assert.equal(holdNumber(picked, '').picked, 'US');
  });

  it('swaps the code of a number written with one for the country picked', function () {
    const written = typeNumber(startPhoneEntry('', ['en-GB']), '+44 7400 123456').entry;
    assert.deepEqual(pickCountry(written, 'IE'), {
      entry: { typed: '+353 7400 123456', picked: 'IE' },
      number: '+353 7400 123456',
    });
    const atHome = typeNumber(startPhoneEntry('', ['en-GB']), '07400 123456').entry;
    assert.equal(pickCountry(atHome, 'IE').number, '+353 07400 123456');
  });

  it("starts from the country of the reader's language", function () {
    assert.equal(phoneCountryOfLocales(['en-GB']), 'GB');
    assert.equal(phoneCountryOfLocales(['fr']), 'FR');
    assert.equal(phoneCountryOfLocales(['not a locale', 'de-AT']), 'AT');
    assert.equal(phoneCountryOfLocales([]), undefined);
  });

  // A code several countries share stands for the country libphonenumber-js puts first for it.
  it('takes a shared code to mean the country the rules take it to mean', function () {
    const metadata: { country_calling_codes: Record<string, string[]> } = createRequire(
      import.meta.url,
    )('libphonenumber-js/metadata.max.json');
    for (const [callingCode, countries] of Object.entries(metadata.country_calling_codes)) {
      assert.equal(readCallingCode(`+${callingCode}`)?.country, countries[0], callingCode);
    }
  });

  // Copied from the smallest metadata, which libphonenumber-js places a number with by default.
  it('places a number on a shared code with what the rules place it with', function () {
    const metadata: {
      country_calling_codes: Record<string, string[]>;
      countries: Record<string, unknown[]>;
    } = createRequire(import.meta.url)('libphonenumber-js/metadata.min.json');
    const copied = Object.fromEntries(
      Object.entries(metadata.country_calling_codes)
        .filter(([, countries]) => countries.length > 1)
        .map(([callingCode, countries]) => [
          callingCode,
          countries.map((country) => {
            const plan = metadata.countries[country] ?? [];
            const leading = plan[10];
            const types = plan[11];
            return typeof leading === 'string'
              ? { country, leading }
              : {
                  country,
                  general: String(plan[2]),
                  numbers: (Array.isArray(types) ? types : [])
                    .filter(Array.isArray)
                    .map((type) => String(type[0])),
                };
          }),
        ]),
    );
    assert.deepEqual<unknown>(SHARED_CODES, copied);
  });

  // Each country's example number, as the rules give it, is shown as the country they read it as.
  it('shows the country the rules read a number on a shared code as', function () {
    for (const plans of Object.values(SHARED_CODES)) {
      for (const { country } of plans) {
        const example = getExampleNumber(country, examples);
        if (example) {
          const read = parsePhoneNumber(example.number).country ?? plans[0]?.country;
          assert.equal(startPhoneEntry(example.number, []).picked, read, example.number);
        }
      }
    }
  });

  it("reads each country's way of dialling abroad as the rules do", function () {
    const metadata: { countries: Record<string, [string, string]> } = createRequire(
      import.meta.url,
    )('libphonenumber-js/metadata.max.json');
    for (const country of getCountries()) {
      assert.equal(
        isPhoneCountry(country) && INTERNATIONAL_PREFIXES[country],
        metadata.countries[country]?.[1],
        country,
      );
    }
  });

  it("draws a country's flag", function () {
    assert.equal(flagOf('GB'), '🇬🇧');
  });

  it('knows a country no number belongs to', function () {
    assert.equal(isPhoneCountry('GB'), true);
    assert.equal(isPhoneCountry('AQ'), false);
    assert.equal(isPhoneCountry('toString'), false);
  });
});
