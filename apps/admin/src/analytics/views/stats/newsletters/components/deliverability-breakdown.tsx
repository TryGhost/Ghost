// Prototype: demo data model for the "Avg. delivery rate" KPI tab and its
// inbox-provider filter. Real implementation: per-send delivery rate from
// emails.delivered_count / email_count; the per-provider dimension from
// Mailgun's aggregate stats grouped by recipient domain (needs a per-post
// Mailgun tag to scope per send). Custom-domain mailboxes (Google Workspace,
// M365) land in "Other" until MX classification exists.

export const DELIVERY_PROVIDERS = [
  { key: 'gmail', label: 'Gmail', share: 0.58, base: 0.998 },
  { key: 'yahoo', label: 'Yahoo', share: 0.12, base: 0.993 },
  { key: 'outlook', label: 'Outlook', share: 0.11, base: 0.994 },
  { key: 'icloud', label: 'Apple iCloud', share: 0.09, base: 0.996 },
  { key: 'other', label: 'Other', share: 0.1, base: 0.988 },
] as const;

export type DeliveryProviderKey = (typeof DELIVERY_PROVIDERS)[number]['key'] | 'all';

const singleProviderRate = (
  provider: (typeof DELIVERY_PROVIDERS)[number],
  sendIndex: number,
  totalSends: number,
): number => {
  // Deterministic wiggle so the chart is stable between renders
  let value = provider.base + Math.sin(sendIndex * 2.3 + provider.base * 997) * 0.003;
  // Demo story: Outlook reputation issue on the most recent sends
  if (provider.key === 'outlook' && sendIndex >= totalSends - 2) {
    value -= 0.026;
  }
  return Math.min(1, value);
};

export const deliveryRateForSend = (
  providerKey: DeliveryProviderKey,
  sendIndex: number,
  totalSends: number,
): number => {
  // Deliberately NO partial-send-failure outlier here: this chart measures
  // deliverability (bounces of what was sent), and a Ghost-side sending
  // failure is a different fact with its own surfaces (post status, posts
  // list). Mixing it in both conflates coverage with deliverability and
  // squashes the axis until real provider shifts are unreadable.
  if (providerKey === 'all') {
    return DELIVERY_PROVIDERS.reduce(
      (sum, provider) => sum + singleProviderRate(provider, sendIndex, totalSends) * provider.share,
      0,
    );
  }
  const provider = DELIVERY_PROVIDERS.find((p) => p.key === providerKey);
  return provider ? singleProviderRate(provider, sendIndex, totalSends) : 0;
};
