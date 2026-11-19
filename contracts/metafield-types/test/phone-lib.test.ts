import { describe, expect, it } from 'vitest';
import { phoneLib as bundled } from '../src/phone-lib.ts';
import { phoneLib as lazy } from '../src/phone-lib.node.ts';

describe('#phone-lib', () => {
  it('gives Node the same library a bundle gets', () => {
    expect(Object.keys(lazy()).sort()).toEqual(Object.keys(bundled()).sort());
    for (const lib of [bundled(), lazy()]) {
      expect(
        lib.parsePhoneNumberFromString('020 7946 0000', { defaultCountry: 'GB' })?.number,
      ).toBe('+442079460000');
      expect(lib.getExampleNumber('BR', lib.examples)?.formatInternational()).toBe(
        '+55 11 96123 4567',
      );
    }
  });

  it('loads the library once in Node', () => {
    expect(lazy()).toBe(lazy());
  });
});
