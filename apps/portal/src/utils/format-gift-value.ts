import { formatNumber, getCurrencySymbol, getStripeAmount } from './helpers';

interface GiftPrice {
  amount?: number | null;
  currency?: string | null;
}

export function formatGiftValue(price?: GiftPrice | null): string {
  const { amount, currency } = price ?? {};
  if (amount === null || amount === undefined || !currency) {
    return '';
  }
  return `${getCurrencySymbol(currency)}${formatNumber(getStripeAmount(amount))}`;
}
