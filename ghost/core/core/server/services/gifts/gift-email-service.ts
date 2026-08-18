import {GiftEmailRenderer, Translate} from './gift-email-renderer';
import type {GiftCadence} from './gift-schema';
import {Color} from '@tryghost/color-utils';
import errors from '@tryghost/errors';
import {getMailgunMessageId} from '../lib/mailgun-message-id';

const DEFAULT_DATE_LOCALE = 'en-gb';
const DEFAULT_ACCENT_COLOR = '#15212A';

interface TransactionalMailer {
    send(message: {
        to: string;
        subject: string;
        html: string;
        text: string;
        from: string;
        forceTextContent: boolean;
        tags?: string[];
        trackOpens?: boolean;
        disableTracking?: boolean;
    }): Promise<unknown>;
}

interface BulkMailer {
    isConfigured(): boolean;
    send(
        message: {
            subject: string;
            html: string;
            plaintext: string;
            from: string;
            tags: string[];
            disable_tracking: boolean;
        },
        recipientData: Record<string, Record<string, never>>,
        replacements: never[]
    ): Promise<unknown>;
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
    cadence: GiftCadence;
    duration: number;
    expiresAt: Date;
    recipientEmail?: string | null;
}

interface ReminderData {
    memberEmail: string;
    memberName: string | null;
    tierName: string;
    consumesAt: Date;
}

interface GiftDeliverySendData {
    recipientEmail: string;
    recipientName: string | null;
    buyerEmail: string;
    buyerName: string;
    personalMessage: string | null;
    token: string;
    tierName: string;
    benefits: string[];
    cadence: GiftCadence;
    duration: number;
    expiresAt: Date;
}

export class GiftEmailService {
    private readonly transactionalMailer: TransactionalMailer;
    private readonly bulkMailer: BulkMailer;
    private readonly settingsCache: SettingsCache;
    private readonly urlUtils: UrlUtils;
    private readonly getFromAddress: () => string;
    private readonly blogIcon: BlogIcon;
    private readonly renderer: GiftEmailRenderer;
    private readonly t: Translate;

    constructor({transactionalMailer, bulkMailer, settingsCache, urlUtils, getFromAddress, blogIcon, t}: {transactionalMailer: TransactionalMailer; bulkMailer: BulkMailer; settingsCache: SettingsCache; urlUtils: UrlUtils; getFromAddress: () => string; blogIcon: BlogIcon; t: Translate}) {
        this.transactionalMailer = transactionalMailer;
        this.bulkMailer = bulkMailer;
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

    private get accentColor(): string {
        return this.settingsCache.get('accent_color') || DEFAULT_ACCENT_COLOR;
    }

    private mixAccentColor(target: string, accentWeight: number, fallback: string): string {
        try {
            return Color(target).mix(Color(this.accentColor), accentWeight).hex().toLowerCase();
        } catch {
            return fallback;
        }
    }

    private get accentTint(): string {
        return this.mixAccentColor('#FFFFFF', 0.07, '#F4F5F6');
    }

    private get accentShade(): string {
        return this.mixAccentColor('#15212A', 0.72, '#738A94');
    }

    private formatDate(date: Date): string {
        const locale = this.settingsCache.get('locale') || DEFAULT_DATE_LOCALE;

        return new Intl.DateTimeFormat(locale, {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }).format(date);
    }

    async sendPurchaseConfirmation({buyerEmail, token, tierName, cadence, duration, expiresAt, recipientEmail = null}: PurchaseConfirmationData): Promise<void> {
        const siteDomain = this.siteDomain;
        const siteUrl = this.urlUtils.getSiteUrl();
        const siteTitle = this.settingsCache.get('title') ?? siteDomain;

        const giftLink = `${siteUrl.replace(/\/$/, '')}/gift/${token}`;
        const {html, text} = await this.renderer.renderPurchaseConfirmation({
            siteTitle,
            siteUrl,
            siteIconUrl: this.blogIcon.getIconUrl({absolute: true, fallbackToDefault: false}),
            siteDomain,
            accentColor: this.settingsCache.get('accent_color'),
            toEmail: buyerEmail,
            gift: {
                tierName,
                duration,
                isMonthly: cadence === 'month',
                link: giftLink,
                expiresAt: this.formatDate(expiresAt),
                recipientEmail
            }
        });

        await this.transactionalMailer.send({
            to: buyerEmail,
            subject: recipientEmail ? this.t('Your gift is on its way') : this.t('Your gift is ready'),
            html,
            text,
            from: this.getFromAddress(),
            forceTextContent: true,
            disableTracking: true
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
            accentColor: this.settingsCache.get('accent_color'),
            memberEmail,
            firstName,
            gift: {
                tierName,
                consumesAt: this.formatDate(consumesAt),
                manageSubscriptionUrl
            }
        });

        await this.transactionalMailer.send({
            to: memberEmail,
            subject: this.t('Your gift subscription is ending soon'),
            html,
            text,
            from: this.getFromAddress(),
            forceTextContent: true
        });
    }

    async sendGiftDelivery({recipientEmail, recipientName, buyerEmail, buyerName, personalMessage, token, tierName, benefits, cadence, duration, expiresAt}: GiftDeliverySendData): Promise<{providerMessageId: string | null}> {
        const siteDomain = this.siteDomain;
        const siteUrl = this.urlUtils.getSiteUrl();
        const siteTitle = this.settingsCache.get('title') ?? siteDomain;
        const giftLink = `${siteUrl.replace(/\/$/, '')}/gift/${token}`;
        const {html, text} = await this.renderer.renderDelivery({
            siteTitle,
            siteUrl,
            siteIconUrl: this.blogIcon.getIconUrl({absolute: true, fallbackToDefault: false}),
            siteDomain,
            accentColor: this.accentColor,
            accentTint: this.accentTint,
            accentShade: this.accentShade,
            toEmail: recipientEmail,
            buyerEmail,
            buyerName,
            recipientName,
            personalMessage,
            gift: {
                tierName,
                benefits,
                duration,
                isMonthly: cadence === 'month',
                link: giftLink,
                expiresAt: this.formatDate(expiresAt)
            }
        });
        const subject = this.t('{buyerName} sent you a gift', {
            buyerName,
            interpolation: {escapeValue: false}
        });

        if (!this.bulkMailer.isConfigured()) {
            await this.transactionalMailer.send({
                to: recipientEmail,
                subject,
                html,
                text,
                from: this.getFromAddress(),
                forceTextContent: true,
                tags: ['gift-delivery'],
                disableTracking: true
            });

            return {providerMessageId: null};
        }

        const response = await this.bulkMailer.send({
            subject,
            html,
            plaintext: text,
            from: this.getFromAddress(),
            tags: ['gift-delivery'],
            disable_tracking: true
        }, {[recipientEmail]: {}}, []);
        const providerMessageId = getMailgunMessageId(response) ?? null;

        if (!providerMessageId) {
            throw new errors.EmailError({
                message: 'Bulk Mailgun did not accept gift delivery',
                code: 'EMAIL_NOT_ACCEPTED'
            });
        }

        return {providerMessageId};
    }
}
