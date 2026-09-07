import type { Translate } from '../gift-email-renderer';
import { renderBuyerNoticeText, type GiftRecipientNoticeData } from './gift-buyer-notice';

export type GiftSentConfirmationData = GiftRecipientNoticeData;

export function renderText(data: GiftSentConfirmationData, t: Translate): string {
  return renderBuyerNoticeText(data, t, {
    heading: t('Your gift has been sent'),
    intro: t(
      'Your gift was sent to {recipientEmail}. You can also share the link below yourself.',
      {
        recipientEmail: data.gift.recipientEmail,
        interpolation: { escapeValue: false },
      },
    ),
  });
}
