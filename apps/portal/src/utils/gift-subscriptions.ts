export const GIFT_DURATION_CATALOGUE = [1, 3, 6, 12] as const;

export type GiftDuration = typeof GIFT_DURATION_CATALOGUE[number];

interface GiftPrice {
    amount?: unknown;
    currency?: unknown;
    [key: string]: unknown;
}

interface ValidGiftPrice extends GiftPrice {
    amount: number;
    currency: string;
}

interface GiftProduct {
    id: string;
    type?: string;
    monthlyPrice?: GiftPrice | null;
    yearlyPrice?: GiftPrice | null;
}

interface GiftSite {
    paid_members_enabled?: boolean;
    portal_plans?: string[];
    portal_products?: string[];
    products?: GiftProduct[];
}

function getPriceForDuration(product: GiftProduct, duration: GiftDuration): GiftPrice | null | undefined {
    if (duration === 12) {
        return product.yearlyPrice;
    }

    return product.monthlyPrice;
}

function hasValidPrice(price: GiftPrice | null | undefined): price is ValidGiftPrice {
    return !!price
        && typeof price.amount === 'number'
        && Number.isSafeInteger(price.amount)
        && price.amount > 0
        && typeof price.currency === 'string'
        && !!price.currency;
}

function isDurationEnabled({portalPlans, duration}: {portalPlans: string[]; duration: GiftDuration}): boolean {
    return duration === 12
        ? portalPlans.includes('yearly')
        : portalPlans.includes('monthly');
}

export function getGiftPrice(product: GiftProduct, duration: GiftDuration): ValidGiftPrice | null {
    const price = getPriceForDuration(product, duration);

    if (!hasValidPrice(price)) {
        return null;
    }

    return {
        ...price,
        amount: duration === 12 ? price.amount : price.amount * duration
    };
}

export function getGiftProducts({site, duration}: {site?: GiftSite | null | undefined; duration: GiftDuration}): GiftProduct[] {
    const {
        paid_members_enabled: paidMembersEnabled,
        portal_plans: portalPlans = [],
        portal_products: portalProducts,
        products = []
    } = site || {};

    if (!paidMembersEnabled || !isDurationEnabled({portalPlans, duration})) {
        return [];
    }

    return products.filter(product => (
        product?.type === 'paid'
        && (!Array.isArray(portalProducts) || portalProducts.includes(product.id))
        && !!getGiftPrice(product, duration)
    )).sort((productA, productB) => (
        (getGiftPrice(productA, duration)?.amount ?? 0) - (getGiftPrice(productB, duration)?.amount ?? 0)
    ));
}

export function getAvailableGiftDurations({site}: {site?: GiftSite | null | undefined}): GiftDuration[] {
    return GIFT_DURATION_CATALOGUE.filter(duration => getGiftProducts({site, duration}).length > 0);
}

export function getActiveGiftDuration({
    availableDurations,
    portalDefaultPlan,
    selectedDuration
}: {
    availableDurations: readonly GiftDuration[];
    portalDefaultPlan?: string | null;
    selectedDuration?: GiftDuration | null;
}): GiftDuration | null {
    if (selectedDuration && availableDurations.includes(selectedDuration)) {
        return selectedDuration;
    }

    const defaultDuration: GiftDuration = portalDefaultPlan === 'yearly' ? 12 : 1;

    if (availableDurations.includes(defaultDuration)) {
        return defaultDuration;
    }

    return availableDurations[0] ?? null;
}
