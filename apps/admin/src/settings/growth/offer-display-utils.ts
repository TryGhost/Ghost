import { formatNumber } from "@tryghost/shade/utils";
import type { Tier } from "@tryghost/admin-x-framework/api/tiers";
import { currencyToDecimal, getSymbol } from "@tryghost/admin-x-settings/src/utils/currency";
import { numberWithCommas } from "@tryghost/admin-x-settings/src/utils/helpers";

/**
 * Display helpers for the offers index rows, ported from the legacy
 * offers/offers-index.tsx exports (cadence/duration labels + the
 * discounted-price math).
 */

export const getOfferCadence = (cadence: string): string => {
    return cadence === "month" ? "monthly" : "yearly";
};

export const getOfferDuration = (duration: string): string => {
    return (duration === "once" ? "First payment" : duration === "repeating" ? "Repeating" : "Forever");
};

export const getOfferDiscount = (type: string, amount: number, cadence: string, currency: string, tier: Tier | undefined): { discountOffer: string; originalPriceWithCurrency: string; updatedPriceWithCurrency: string } => {
    let discountOffer = "";
    const originalPrice = cadence === "month" ? tier?.monthly_price ?? 0 : tier?.yearly_price ?? 0;
    let updatedPrice = originalPrice;

    const formatToTwoDecimals = (num: number): number => parseFloat(num.toFixed(2));

    let originalPriceWithCurrency = getSymbol(currency) + numberWithCommas(formatToTwoDecimals(currencyToDecimal(originalPrice)));

    switch (type) {
        case "percent":
            discountOffer = `${formatNumber(amount)}% off`;
            updatedPrice = originalPrice - ((originalPrice * amount) / 100);
            break;
        case "fixed":
            discountOffer = numberWithCommas(formatToTwoDecimals(currencyToDecimal(amount))) + " " + currency + " off";
            updatedPrice = originalPrice - amount;
            break;
        case "trial":
            discountOffer = `${formatNumber(amount)} days free`;
            originalPriceWithCurrency = "";
            break;
        default:
            break;
    }

    if (updatedPrice < 0) {
        updatedPrice = 0;
    }

    const updatedPriceWithCurrency = getSymbol(currency) + numberWithCommas(formatToTwoDecimals(currencyToDecimal(updatedPrice)));

    return {
        discountOffer,
        originalPriceWithCurrency,
        updatedPriceWithCurrency,
    };
};
