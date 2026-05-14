import {GiftEmailRenderer, Translate} from './gift-email-renderer';

const DEFAULT_CURRENCY_LOCALE = 'en';
const DEFAULT_DATE_LOCALE = 'en-gb';

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

    private getCadenceLabel(cadence: 'month' | 'year', duration: number): string {
        if (cadence === 'year') {
            return this.t('{count} year', {count: duration});
        }
        return this.t('{count} month', {count: duration});
    }

    private formatDate(date: Date): string {
        const locale = this.settingsCache.get('locale') || DEFAULT_DATE_LOCALE;

        return new Intl.DateTimeFormat(locale, {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }).format(date);
    }

    async sendPurchaseConfirmation({buyerEmail, token, tierName, cadence, duration, expiresAt}: PurchaseConfirmationData): Promise<void> {
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
            accentColor: this.settingsCache.get('accent_color'),
            toEmail: buyerEmail,
            gift: {
                tierName,
                cadenceLabel,
                link: giftLink,
                expiresAt: this.formatDate(expiresAt)
            }
        });

        await this.mailer.send({
            to: buyerEmail,
            subject: this.t('Your gift is ready to share'),
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

        // Possible values for cadence, for the i18n parser:
        // t('month')
        // t('year')
        const priceAfter = `${formattedPrice}/${this.t(cadence)}`;

        const manageSubscriptionUrl = new URL('#/portal/account', siteUrl).href;

        const {html, text} = await this.renderer.renderReminder({
            siteTitle,
            siteUrl,
            siteIconUrl: this.blogIcon.getIconUrl({absolute: true, fallbackToDefault: false}),
            siteDomain,
            accentColor: this.settingsCache.get('accent_color'),
            memberEmail,
            gift: {
                tierName,
                consumesAt: this.formatDate(consumesAt),
                priceAfter,
                manageSubscriptionUrl
            }
        });

        await this.mailer.send({
            to: memberEmail,
            subject: this.t('Your gift subscription to {siteTitle} is ending soon', {
                siteTitle,
                interpolation: {escapeValue: false}
            }),
            html,
            text,
            from: this.getFromAddress(),
            forceTextContent: true
        });
    }

    private formatAmount({amount = 0, currency}: {amount?: number; currency?: string}): string {
        const locale = this.settingsCache.get('locale') || DEFAULT_CURRENCY_LOCALE;

        if (!currency) {
            return Intl.NumberFormat(locale, {maximumFractionDigits: 2}).format(amount);
        }

        return Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            currencyDisplay: 'symbol',
            maximumFractionDigits: 2,
            minimumFractionDigits: 2
        }).format(amount);
    }
}
