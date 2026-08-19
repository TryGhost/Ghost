import errors from '@tryghost/errors';

export const DEFAULT_AMOUNT = 100;
export const DEFAULT_CURRENCY = 'USD';

type SettingsCache = {
    get: (key: string) => unknown;
};

type PricingDeps = {
    settingsCache: SettingsCache;
    defaultCurrencyProvider?: () => Promise<string | null | undefined>;
};

export type PaymentAmountTerms = {
    amount: number;
    currency: string;
};

export class Pricing {
    settingsCache: SettingsCache;
    defaultCurrencyProvider?: () => Promise<string | null | undefined>;

    constructor({settingsCache, defaultCurrencyProvider}: PricingDeps) {
        this.settingsCache = settingsCache;
        this.defaultCurrencyProvider = defaultCurrencyProvider;
    }

    async getTerms(): Promise<PaymentAmountTerms> {
        const configuredAmount = this.settingsCache.get('machine_payments_amount');
        const amount = Number(configuredAmount === null || configuredAmount === undefined
            ? DEFAULT_AMOUNT
            : configuredAmount);
        this.assertValidAmount(amount);

        const configuredCurrency = this.settingsCache.get('machine_payments_currency');
        const currency = String(configuredCurrency
            || (await this.defaultCurrencyProvider?.())
            || DEFAULT_CURRENCY
        ).toUpperCase();

        return {amount, currency};
    }

    /**
     * SPT/card rails use configured fiat. Tempo USDC uses the same minor-unit
     * amount as a USDC charge (documented product fence — not FX conversion).
     */
    forSpt(terms: PaymentAmountTerms) {
        return {
            amount: terms.amount,
            currency: terms.currency.toLowerCase(),
            majorAmount: (terms.amount / 100).toFixed(2)
        };
    }

    forTempoUsdc(terms: {amount: number}) {
        return {
            amount: terms.amount,
            majorAmount: (terms.amount / 100).toFixed(2)
        };
    }

    assertValidAmount(amount: number) {
        if (!Number.isSafeInteger(amount) || amount < 1) {
            throw new errors.ValidationError({
                message: 'Machine payments amount must be an integer greater than 0'
            });
        }
    }
}
