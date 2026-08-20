import type {Translate} from '../gift-email-renderer';

export interface GiftBuyerNoticeData {
    siteTitle: string;
    siteUrl: string;
    siteIconUrl: string | null;
    siteDomain: string;
    toEmail: string;
    gift: {
        link: string;
        expiresAt: string;
        // Not read by the shared body; the notices interpolate it into their
        // own intro sentences.
        recipientEmail?: string | null;
    };
}

export type GiftRecipientNoticeData = GiftBuyerNoticeData & {
    gift: GiftBuyerNoticeData['gift'] & {recipientEmail: string};
};

export function renderBuyerNoticeText(data: GiftBuyerNoticeData, t: Translate, {heading, intro}: {heading: string; intro: string}): string {
    return `${heading}

${intro}

${data.gift.link}

${t('The link expires on {expiresAt} and can only be redeemed once.', {
        expiresAt: data.gift.expiresAt,
        interpolation: {escapeValue: false}
    })}

---
${t('This message was sent from {siteDomain} to {email}.', {
        siteDomain: data.siteDomain,
        email: data.toEmail,
        interpolation: {escapeValue: false}
    })}`;
}
