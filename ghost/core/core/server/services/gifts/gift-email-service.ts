import {GiftEmailRenderer, Translate} from './gift-email-renderer';

const DEFAULT_DATE_LOCALE = 'en-gb';
const DEFAULT_ACCENT_COLOR = '#15212A';

interface Mailer {
    send(message: {
        to: string;
        subject: string;
        html: string;
        text: string;
        from: string;
        forceTextContent: boolean;
    }): Promise<void>;
}

interface SettingsCache {
    get(key: string, options?: unknown): string | undefined;
}

interface UrlUtils {
    getSiteUrl(): string;
}

interface BlogIcon {
    getIconUrl(options: {absolute: boolean; fallbackToDefault: boolean}): string | null;
}

interface PurchaseConfirmationData {
    buyerEmail: string;
    token: string;
    tierName: string;
    cadence: 'month' | 'year';
    duration: number;
    expiresAt: Date;
    recipientEmail: string | null;
    deliverAt: Date | null;
}

interface ReminderData {
    memberEmail: string;
    memberName: string | null;
    tierName: string;
    consumesAt: Date;
}

interface GiftDeliverySendData {
    recipientEmail: string;
    buyerName: string | null;
    recipientName: string | null;
    message: string | null;
    token: string;
    tierName: string;
    benefits: string[];
    cadence: 'month' | 'year';
    duration: number;
    expiresAt: Date;
}

interface GiftDeliveredConfirmationSendData {
    buyerEmail: string;
    recipientEmail: string;
    token: string;
    tierName: string;
    cadence: 'month' | 'year';
    duration: number;
    expiresAt: Date;
}

export class GiftEmailService {
    private readonly mailer: Mailer;
    private readonly settingsCache: SettingsCache;
    private readonly urlUtils: UrlUtils;
    private readonly getFromAddress: () => string;
    private readonly blogIcon: BlogIcon;
    private readonly renderer: GiftEmailRenderer;
    private readonly t: Translate;

    constructor({mailer, settingsCache, urlUtils, getFromAddress, blogIcon, t}: {mailer: Mailer; settingsCache: SettingsCache; urlUtils: UrlUtils; getFromAddress: () => string; blogIcon: BlogIcon; t: Translate}) {
        this.mailer = mailer;
        this.settingsCache = settingsCache;
        this.urlUtils = urlUtils;
        this.getFromAddress = getFromAddress;
        this.blogIcon = blogIcon;
        this.t = t;

        this.renderer = new GiftEmailRenderer({t});
    }

    private get siteDomain(): string {
        try {
            return new URL(this.urlUtils.getSiteUrl()).hostname;
        } catch {
            return '';
        }
    }

    // Never let the CTA/accents render on an empty background: an unset
    // accent_color would produce `background-color:` with white text — an
    // invisible button. Fall back to Ghost's default dark.
    private get accentColor(): string {
        return this.settingsCache.get('accent_color') || DEFAULT_ACCENT_COLOR;
    }

    // Must produce the same words as Portal's getGiftDurationLabel so the
    // delivery email and the redemption page describe the gift identically
    // ("1 year", "3 years", "1 month", "3 months").
    private getCadenceLabel(cadence: 'month' | 'year', duration: number): string {
        if (duration === 1) {
            return cadence === 'year' ? this.t('1 year') : this.t('1 month');
        }
        if (cadence === 'year') {
            return this.t('{count} years', {count: duration});
        }
        return this.t('{count} months', {count: duration});
    }

    private formatDate(date: Date): string {
        const locale = this.settingsCache.get('locale') || DEFAULT_DATE_LOCALE;

        return new Intl.DateTimeFormat(locale, {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }).format(date);
    }

    async sendPurchaseConfirmation({buyerEmail, token, tierName, cadence, duration, expiresAt, recipientEmail, deliverAt}: PurchaseConfirmationData): Promise<void> {
        const siteDomain = this.siteDomain;
        const siteUrl = this.urlUtils.getSiteUrl();
        const siteTitle = this.settingsCache.get('title') ?? siteDomain;

        const giftLink = `${siteUrl.replace(/\/$/, '')}/gift/${token}`;
        const cadenceLabel = this.getCadenceLabel(cadence, duration);

        const {html, text} = await this.renderer.renderPurchaseConfirmation({
            siteTitle,
            siteUrl,
            siteIconUrl: this.blogIcon.getIconUrl({absolute: true, fallbackToDefault: false}),
            siteDomain,
            accentColor: this.accentColor,
            toEmail: buyerEmail,
            gift: {
                tierName,
                cadenceLabel,
                link: giftLink,
                expiresAt: this.formatDate(expiresAt),
                recipientEmail,
                deliverAt: deliverAt ? this.formatDate(deliverAt) : null
            }
        });

        // Lead the subject with what actually happens next: for a scheduled
        // gift the useful fact is the date, for an immediate send it's that
        // the gift is already on its way to the recipient
        let subject;
        if (recipientEmail && deliverAt) {
            subject = this.t('Your gift will be delivered on {deliverAt}', {
                deliverAt: this.formatDate(deliverAt),
                interpolation: {escapeValue: false}
            });
        } else if (recipientEmail) {
            subject = this.t('Your gift is on its way');
        } else {
            subject = this.t('Your gift is ready');
        }

        await this.mailer.send({
            to: buyerEmail,
            subject,
            html,
            text,
            from: this.getFromAddress(),
            forceTextContent: true
        });
    }

    async sendGiftDelivery({recipientEmail, buyerName, recipientName, message, token, tierName, benefits, cadence, duration, expiresAt}: GiftDeliverySendData): Promise<void> {
        const siteDomain = this.siteDomain;
        const siteUrl = this.urlUtils.getSiteUrl();
        const siteTitle = this.settingsCache.get('title') ?? siteDomain;

        const giftLink = `${siteUrl.replace(/\/$/, '')}/gift/${token}`;
        const cadenceLabel = this.getCadenceLabel(cadence, duration);

        const {html, text} = await this.renderer.renderDelivery({
            siteTitle,
            siteUrl,
            siteIconUrl: this.blogIcon.getIconUrl({absolute: true, fallbackToDefault: false}),
            siteDomain,
            accentColor: this.accentColor,
            toEmail: recipientEmail,
            buyerName,
            recipientName,
            message,
            gift: {
                tierName,
                benefits,
                cadenceLabel,
                link: giftLink,
                expiresAt: this.formatDate(expiresAt)
            }
        });

        const subject = buyerName
            ? this.t('{buyerName} sent you a gift', {buyerName, interpolation: {escapeValue: false}})
            : this.t('You\'ve received a gift');

        await this.mailer.send({
            to: recipientEmail,
            subject,
            html,
            text,
            from: this.getFromAddress(),
            forceTextContent: true
        });
    }

    async sendDeliveredConfirmation({buyerEmail, recipientEmail, token, tierName, cadence, duration, expiresAt}: GiftDeliveredConfirmationSendData): Promise<void> {
        const siteDomain = this.siteDomain;
        const siteUrl = this.urlUtils.getSiteUrl();
        const siteTitle = this.settingsCache.get('title') ?? siteDomain;

        const giftLink = `${siteUrl.replace(/\/$/, '')}/gift/${token}`;
        const cadenceLabel = this.getCadenceLabel(cadence, duration);

        const {html, text} = await this.renderer.renderDeliveredConfirmation({
            siteTitle,
            siteUrl,
            siteIconUrl: this.blogIcon.getIconUrl({absolute: true, fallbackToDefault: false}),
            siteDomain,
            accentColor: this.accentColor,
            toEmail: buyerEmail,
            gift: {
                tierName,
                cadenceLabel,
                recipientEmail,
                link: giftLink,
                expiresAt: this.formatDate(expiresAt)
            }
        });

        await this.mailer.send({
            to: buyerEmail,
            subject: this.t('Your gift has been delivered'),
            html,
            text,
            from: this.getFromAddress(),
            forceTextContent: true
        });
    }

    async sendReminder({memberEmail, memberName, tierName, consumesAt}: ReminderData): Promise<void> {
        const siteDomain = this.siteDomain;
        const siteUrl = this.urlUtils.getSiteUrl();
        const siteTitle = this.settingsCache.get('title') ?? siteDomain;

        const manageSubscriptionUrl = new URL('#/portal/account', siteUrl).href;
        const firstName = memberName?.trim().split(/\s+/)[0] || null;

        const {html, text} = await this.renderer.renderReminder({
            siteTitle,
            siteUrl,
            siteIconUrl: this.blogIcon.getIconUrl({absolute: true, fallbackToDefault: false}),
            siteDomain,
            accentColor: this.accentColor,
            memberEmail,
            firstName,
            gift: {
                tierName,
                consumesAt: this.formatDate(consumesAt),
                manageSubscriptionUrl
            }
        });

        await this.mailer.send({
            to: memberEmail,
            subject: this.t('Your gift subscription is ending soon'),
            html,
            text,
            from: this.getFromAddress(),
            forceTextContent: true
        });
    }
}
