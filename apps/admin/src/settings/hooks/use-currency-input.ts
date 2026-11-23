import { useEffect, useRef, useState } from 'react';

type DecimalMark = '.' | ',';

/**
 * The decimal mark of the viewer's locale. Phone keyboards in comma-decimal
 * locales type `,` for decimals, even in text inputs.
 */
const localeDecimalMark = (): DecimalMark => {
  try {
    const decimal = new Intl.NumberFormat()
      .formatToParts(1.5)
      .find((part) => part.type === 'decimal');
    return decimal?.value === ',' ? ',' : '.';
  } catch {
    return '.';
  }
};

/**
 * Finds the decimal mark in typed text, or -1 when there is none. When both
 * separators appear, the last kind is the decimal mark ("1,000.50", "1.000,50").
 * A `.` on its own always is. A `,` on its own is only in comma-decimal
 * locales; elsewhere it groups thousands ("1,000"). Text alone can't tell
 * "1,00" on the way to "1,000" from "9,90" with one digit too many, so the
 * locale decides instead of the digit count.
 */
const decimalMarkIndex = (text: string, localeMark: DecimalMark) => {
  const lastDot = text.lastIndexOf('.');
  const lastComma = text.lastIndexOf(',');
  let mark: DecimalMark;
  if (lastDot !== -1 && lastComma !== -1) {
    mark = lastDot > lastComma ? '.' : ',';
  } else if (lastDot !== -1) {
    mark = '.';
  } else if (lastComma !== -1 && localeMark === ',') {
    mark = ',';
  } else {
    return -1;
  }
  // The first mark after the last separator of the other kind, so a stray
  // second mark ("1.5.") is dropped rather than moving the decimal point.
  const otherIndex = text.lastIndexOf(mark === '.' ? ',' : '.');
  return text.indexOf(mark, otherIndex + 1);
};

/**
 * Keeps digits and the decimal mark, as typed, with at most two decimals.
 * Thousands separators are removed. Digits past the second decimal are
 * dropped, never moved into the whole amount.
 */
const cleanInput = (input: string, localeMark: DecimalMark) => {
  const text = input.replace(/[^\d.,]+/g, '');
  const markIndex = decimalMarkIndex(text, localeMark);
  if (markIndex === -1) {
    return text.replace(/[.,]/g, '');
  }
  const whole = text.slice(0, markIndex).replace(/[.,]/g, '');
  const fraction = text
    .slice(markIndex + 1)
    .replace(/[.,]/g, '')
    .slice(0, 2);
  return `${whole}${text[markIndex]}${fraction}`;
};

/** Parses cleaned field text into cents, so the saved amount matches the screen. */
const toCents = (cleanText: string) => {
  const amount = parseFloat(cleanText.replace(',', '.'));
  return Number.isNaN(amount) ? 0 : Math.round(amount * 100);
};

/**
 * The editable text for an amount in cents. Uses the same rule as
 * `formatCurrencyAmount` (whole amounts show no decimals, anything with cents
 * shows two), always with a `.` decimal point, which every locale accepts,
 * and no thousands separators.
 */
const formatInputValue = (cents: number) => {
  const value = cents / 100;
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
};

const useCurrencyInput = (valueInCents: number | '', onChange?: (cents: number) => void) => {
  const [localeMark] = useState(localeDecimalMark);
  const [value, setValue] = useState(
    valueInCents === '' ? '' : formatInputValue(valueInCents || 0),
  );
  const lastEmittedValue = useRef<number | ''>(valueInCents);

  useEffect(() => {
    // Callers pass '' for zero so an untouched field stays empty. Typing "0" or
    // "0." emits 0 and comes back as '', which must not wipe what was typed.
    const isEchoOfZero = valueInCents === '' && lastEmittedValue.current === 0;
    if (!Object.is(valueInCents, lastEmittedValue.current) && !isEchoOfZero) {
      setValue(valueInCents === '' ? '' : formatInputValue(valueInCents || 0));
    }

    lastEmittedValue.current = valueInCents;
  }, [valueInCents]);

  return {
    value,
    onBlur: () =>
      setValue(value === '' ? '' : formatInputValue(toCents(cleanInput(value, localeMark)))),
    onChange: (input: string) => {
      const cleanText = cleanInput(input, localeMark);
      const cents = toCents(cleanText);

      setValue(cleanText);
      lastEmittedValue.current = cents;
      onChange?.(cents);
    },
  };
};

export default useCurrencyInput;
