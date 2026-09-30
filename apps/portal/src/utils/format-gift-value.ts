import { formatPrice, getCurrencySymbol, getStripeAmount } from './helpers';

interface GiftPrice {
  amount?: number | null | undefined;
  currency?: string | null | undefined;
}

export function formatGiftValue(price?: GiftPrice | null, locale?: string): string {
  const { amount, currency } = price ?? {};
  if (amount === null || amount === undefined || !currency) {
    return '';
  }
  return `${getCurrencySymbol(currency)}${formatPrice(getStripeAmount(amount), locale)}`;
}
