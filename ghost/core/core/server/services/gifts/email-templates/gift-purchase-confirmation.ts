import type { Translate } from '../gift-email-renderer';
import { renderBuyerNoticeText } from './gift-buyer-notice';

export interface GiftPurchaseConfirmationData {
  siteTitle: string;
  siteUrl: string;
  siteIconUrl: string | null;
  siteDomain: string;
  accentColor: string | undefined;
  toEmail: string;
  gift: {
    tierName: string;
    duration: number;
    isMonthly: boolean;
    link: string;
    expiresAt: string;
    recipientEmail: string | null;
    // Only ever set alongside recipientEmail: a schedule exists only for
    // emailed gifts.
    deliveryDate: string | null;
  };
}

// Each translated sentence must stay intact; only the selection between them
// varies.
function renderIntro(data: GiftPurchaseConfirmationData, t: Translate): string {
  const gift = data.gift;
  const giftDescription = {
    duration: gift.duration,
    count: gift.duration,
    tierName: gift.tierName,
    siteTitle: data.siteTitle,
    interpolation: { escapeValue: false },
  };

  if (gift.recipientEmail && gift.deliveryDate) {
    const scheduled = {
      ...giftDescription,
      recipientEmail: gift.recipientEmail,
      deliveryDate: gift.deliveryDate,
    };
    return gift.isMonthly
      ? t(
          'Thank you for your support. Your gift — a {duration}-month {tierName} membership to {siteTitle} — will be sent to {recipientEmail} on {deliveryDate}. You can also share the link below yourself.',
          scheduled,
        )
      : t(
          'Thank you for your support. Your gift — a {duration}-year {tierName} membership to {siteTitle} — will be sent to {recipientEmail} on {deliveryDate}. You can also share the link below yourself.',
          scheduled,
        );
  }

  if (gift.recipientEmail) {
    const emailed = {
      ...giftDescription,
      recipientEmail: gift.recipientEmail,
    };
    return gift.isMonthly
      ? t(
          'Thank you for your support. Your gift — a {duration}-month {tierName} membership to {siteTitle} — is on its way to {recipientEmail}. You can also share the link below yourself.',
          emailed,
        )
      : t(
          'Thank you for your support. Your gift — a {duration}-year {tierName} membership to {siteTitle} — is on its way to {recipientEmail}. You can also share the link below yourself.',
          emailed,
        );
  }

  return gift.isMonthly
    ? t(
        "Thank you for your support. Share the link below with whoever you'd like to gift them a {duration}-month {tierName} membership to {siteTitle}.",
        giftDescription,
      )
    : t(
        "Thank you for your support. Share the link below with whoever you'd like to gift them a {duration}-year {tierName} membership to {siteTitle}.",
        giftDescription,
      );
}

export function renderText(data: GiftPurchaseConfirmationData, t: Translate): string {
  const heading =
    data.gift.recipientEmail && data.gift.deliveryDate
      ? t('Your gift is scheduled')
      : data.gift.recipientEmail
        ? t('Your gift is on its way')
        : t('Your gift is ready');

  return renderBuyerNoticeText(data, t, { heading, intro: renderIntro(data, t) });
}
