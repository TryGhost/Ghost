import { useEffect, useRef, useState } from 'react';

const stripNonNumeric = (input: string) => input.replace(/[^\d.,]+/g, '');

/**
 * Mobile keyboards in comma-decimal locales type `,` even in text inputs, so a
 * final comma followed by at most two digits ("9,90", "1,") reads as the
 * decimal mark. Until a third digit arrives the comma could still be grouping
 * ("1," on the way to "1,000"), so callers keep that text as typed.
 */
const hasDecimalComma = (text: string) => {
  const lastComma = text.lastIndexOf(',');
  return lastComma > text.lastIndexOf('.') && text.length - lastComma - 1 <= 2;
};

/** Reads typed text as a plain decimal string with at most two decimals ("1000.50"). */
const normalizedCurrencyValue = (input: string) => {
  const text = stripNonNumeric(input);
  const lastComma = text.lastIndexOf(',');
  const decimal = hasDecimalComma(text)
    ? `${text.slice(0, lastComma).replace(/[.,]/g, '')}.${text.slice(lastComma + 1)}`
    : text.replace(/,/g, '');
  return decimal.match(/^\d*\.?\d{0,2}/)?.[0] ?? '';
};

/**
 * Parses the field's text into cents, accepting either `.` or `,` as the
 * decimal mark, so the amount the form saves matches what is on screen.
 */
const forceCurrencyValue = (input: string) => {
  const amount = parseFloat(normalizedCurrencyValue(input));
  return Number.isNaN(amount) ? 0 : Math.round(amount * 100);
};

/**
 * What the field shows while typing: the normalized amount, except while a
 * trailing comma could still be either decimal mark or thousands separator.
 * Blur normalizes that case too.
 */
const displayValue = (input: string) => {
  const text = stripNonNumeric(input);
  return hasDecimalComma(text) ? text : normalizedCurrencyValue(text);
};

/**
 * The editable text for an amount in cents. Uses the same rule as
 * `formatCurrencyAmount` (whole amounts show no decimals, anything with cents
 * shows two), but always with a `.` decimal point and no thousands separators,
 * because that is the only shape `forceCurrencyValue` can parse back.
 */
const formatInputValue = (cents: number) => {
  const value = cents / 100;
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
};

const useCurrencyInput = (valueInCents: number | '', onChange?: (cents: number) => void) => {
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
    onBlur: () => setValue(value === '' ? '' : formatInputValue(forceCurrencyValue(value))),
    onChange: (input: string) => {
      const cents = forceCurrencyValue(input);

      setValue(displayValue(input));
      lastEmittedValue.current = cents;
      onChange?.(cents);
    },
  };
};

export default useCurrencyInput;
