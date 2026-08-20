import type {Translate} from '../gift-email-renderer';
import {renderBuyerNoticeText, type GiftRecipientNoticeData} from './gift-buyer-notice';

export type GiftDeliveryFailureData = GiftRecipientNoticeData;

export function renderText(data: GiftDeliveryFailureData, t: Translate): string {
    return renderBuyerNoticeText(data, t, {
        heading: t('We couldn\'t deliver your gift'),
        intro: t('We couldn\'t deliver your gift to {recipientEmail}. Send them the gift link below so they can redeem it.', {
            recipientEmail: data.gift.recipientEmail,
            interpolation: {escapeValue: false}
        })
    });
}
