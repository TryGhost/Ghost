import moment from 'moment';
import {GiftEmailRenderer} from './gift-email-renderer';

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
}

interface ReminderData {
    memberEmail: string;
    tierName: string;
    tierPrice: number;
    tierCurrency: string;
    cadence: 'month' | 'year';
    consumesAt: Date;
}

export class GiftEmailService {
    private readonly mailer: Mailer;
    private readonly settingsCache: SettingsCache;
    private readonly urlUtils: UrlUtils;
    private readonly getFromAddress: () => string;
    private readonly blogIcon: BlogIcon;
    private readonly renderer: GiftEmailRenderer;

    constructor({mailer, settingsCache, urlUtils, getFromAddress, blogIcon}: {mailer: Mailer; settingsCache: SettingsCache; urlUtils: UrlUtils; getFromAddress: () => string; blogIcon: BlogIcon}) {
        this.mailer = mailer;
        this.settingsCache = settingsCache;
        this.urlUtils = urlUtils;
        this.getFromAddress = getFromAddress;
        this.blogIcon = blogIcon;

        this.renderer = new GiftEmailRenderer();
    }

    private get siteDomain(): string {
        try {
            return new URL(this.urlUtils.getSiteUrl()).hostname;
        } catch {
            return '';
        }
    }

    async sendPurchaseConfirmation({buyerEmail, token, tierName, cadence, duration, expiresAt}: PurchaseConfirmationData): Promise<void> {
        const siteDomain = this.siteDomain;
        const siteUrl = this.urlUtils.getSiteUrl();
        const siteTitle = this.settingsCache.get('title') ?? siteDomain;

        const giftLink = `${siteUrl.replace(/\/$/, '')}/gift/${token}`;

        const cadenceLabel = duration === 1 ? `1 ${cadence}` : `${duration} ${cadence}s`;

        const templateData = {
            siteTitle,
            siteUrl,
            siteIconUrl: this.blogIcon.getIconUrl({absolute: true, fallbackToDefault: false}),
            siteDomain,
            accentColor: this.settingsCache.get('accent_color'),
            toEmail: buyerEmail,
            gift: {
                tierName,
                cadenceLabel,
                link: giftLink,
                expiresAt: moment(expiresAt).format('D MMM YYYY')
            }
        };

        const {html, text} = await this.renderer.renderPurchaseConfirmation(templateData);

        await this.mailer.send({
            to: buyerEmail,
            subject: 'Your gift is ready to share',
            html,
            text,
            from: this.getFromAddress(),
            forceTextContent: true
        });
    }

    async sendReminder({memberEmail, tierName, tierPrice, tierCurrency, cadence, consumesAt}: ReminderData): Promise<void> {
        const siteDomain = this.siteDomain;
        const siteUrl = this.urlUtils.getSiteUrl();
        const siteTitle = this.settingsCache.get('title') ?? siteDomain;

        const formattedPrice = this.formatAmount({currency: tierCurrency, amount: tierPrice / 100});
        const priceAfter = `${formattedPrice}/${cadence}`;

        const manageSubscriptionUrl = new URL('#/portal/account', siteUrl).href;

        const templateData = {
            siteTitle,
            siteUrl,
            siteIconUrl: this.blogIcon.getIconUrl({absolute: true, fallbackToDefault: false}),
            siteDomain,
            accentColor: this.settingsCache.get('accent_color'),
            memberEmail,
            gift: {
                tierName,
                consumesAt: moment(consumesAt).format('D MMM YYYY'),
                priceAfter,
                manageSubscriptionUrl
            }
        };

        const {html, text} = await this.renderer.renderReminder(templateData);

        await this.mailer.send({
            to: memberEmail,
            subject: `Your gift subscription to ${siteTitle} is ending soon`,
            html,
            text,
            from: this.getFromAddress(),
            forceTextContent: true
        });
    }

    private formatAmount({amount = 0, currency}: {amount?: number; currency?: string}): string {
        if (!currency) {
            return Intl.NumberFormat('en', {maximumFractionDigits: 2}).format(amount);
        }

        return Intl.NumberFormat('en', {
            style: 'currency',
            currency,
            currencyDisplay: 'symbol',
            maximumFractionDigits: 2,
            minimumFractionDigits: 2
        }).format(amount);
    }
}
