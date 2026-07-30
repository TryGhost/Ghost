const {BadRequestError} = require('@tryghost/errors');

const GIFT_DURATION_CATALOGUE = new Map([
    [1, {cadence: 'month', billingDuration: 1, portalPlan: 'monthly', priceProperty: 'monthlyPrice', multiplier: 1}],
    [3, {cadence: 'month', billingDuration: 3, portalPlan: 'monthly', priceProperty: 'monthlyPrice', multiplier: 3}],
    [6, {cadence: 'month', billingDuration: 6, portalPlan: 'monthly', priceProperty: 'monthlyPrice', multiplier: 6}],
    [12, {cadence: 'year', billingDuration: 1, portalPlan: 'yearly', priceProperty: 'yearlyPrice', multiplier: 1}]
]);

function invalidGiftOffer(context) {
    return new BadRequestError({
        message: 'Bad Request.',
        context
    });
}

function resolveGiftDuration({duration, cadence}) {
    let totalMonths = duration;

    if (totalMonths === undefined) {
        if (cadence === 'month') {
            totalMonths = 1;
        } else if (cadence === 'year') {
            totalMonths = 12;
        } else {
            throw invalidGiftOffer('Expected a supported gift duration or legacy cadence');
        }
    }

    if (!Number.isInteger(totalMonths) || !GIFT_DURATION_CATALOGUE.has(totalMonths)) {
        throw invalidGiftOffer(`Unsupported gift duration "${totalMonths}"`);
    }

    const offer = GIFT_DURATION_CATALOGUE.get(totalMonths);

    if (cadence !== undefined && cadence !== offer.cadence) {
        throw invalidGiftOffer(`Gift duration "${totalMonths}" conflicts with cadence "${cadence}"`);
    }

    return {
        ...offer,
        totalMonths
    };
}

function validateGiftCheckoutOffer({tier, portalPlans, duration, cadence}) {
    const offer = resolveGiftDuration({duration, cadence});

    if (tier.status !== 'active' || tier.visibility !== 'public' || tier.type !== 'paid') {
        throw invalidGiftOffer('The requested tier is not available for gift purchases');
    }

    if (!Array.isArray(portalPlans) || !portalPlans.includes(offer.portalPlan)) {
        throw invalidGiftOffer(`The ${offer.portalPlan} Portal plan is not available`);
    }

    const unitAmount = tier[offer.priceProperty];

    if (!Number.isSafeInteger(unitAmount) || unitAmount <= 0 || typeof tier.currency !== 'string' || !tier.currency) {
        throw invalidGiftOffer('The requested tier does not have a valid gift price');
    }

    const amount = unitAmount * offer.multiplier;

    if (!Number.isSafeInteger(amount)) {
        throw invalidGiftOffer('The requested gift amount is invalid');
    }

    return {
        cadence: offer.cadence,
        duration: offer.billingDuration,
        totalMonths: offer.totalMonths,
        amount
    };
}

module.exports = {
    resolveGiftDuration,
    validateGiftCheckoutOffer
};
