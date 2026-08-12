const errors = require('@tryghost/errors');

const DEFAULT_AMOUNT = 100;
const DEFAULT_CURRENCY = 'USD';

/**
 * @param {{settingsCache: {get: (key: string) => unknown}, defaultCurrencyProvider?: () => Promise<string|null>}} deps
 */
class Pricing {
    constructor({settingsCache, defaultCurrencyProvider}) {
        this.settingsCache = settingsCache;
        this.defaultCurrencyProvider = defaultCurrencyProvider;
    }

    /**
     * @returns {Promise<{amount: number, currency: string}>}
     */
    async getTerms() {
        const configuredAmount = this.settingsCache.get('machine_payments_amount');
        const amount = Number(configuredAmount === null || configuredAmount === undefined
            ? DEFAULT_AMOUNT
            : configuredAmount);
        this.assertValidAmount(amount);

        const configuredCurrency = this.settingsCache.get('machine_payments_currency');
        const currency = (configuredCurrency
            || (await this.defaultCurrencyProvider?.())
            || DEFAULT_CURRENCY
        ).toUpperCase();

        return {amount, currency};
    }

    /**
     * SPT/card rails use configured fiat. Tempo USDC uses the same minor-unit
     * amount as a USDC charge (documented product fence — not FX conversion).
     * @param {{amount: number, currency: string}} terms
     */
    forSpt(terms) {
        return {
            amount: terms.amount,
            currency: terms.currency.toLowerCase(),
            majorAmount: (terms.amount / 100).toFixed(2)
        };
    }

    /**
     * @param {{amount: number}} terms
     */
    forTempoUsdc(terms) {
        return {
            amount: terms.amount,
            majorAmount: (terms.amount / 100).toFixed(2)
        };
    }

    assertValidAmount(amount) {
        if (!Number.isSafeInteger(amount) || amount < 1) {
            throw new errors.ValidationError({
                message: 'Machine payments amount must be an integer greater than 0'
            });
        }
    }
}

module.exports = Pricing;
module.exports.DEFAULT_AMOUNT = DEFAULT_AMOUNT;
module.exports.DEFAULT_CURRENCY = DEFAULT_CURRENCY;
