// Must match the server-owned catalogue in
// ghost/core/core/server/services/members/members-api/utils/gift-checkout-offer.js
// until later customization work makes durations server-provided
export const GIFT_DURATION_CATALOGUE = [1, 3, 6, 12] as const;

export type GiftDuration = typeof GIFT_DURATION_CATALOGUE[number];

type PortalPlan = 'free' | 'monthly' | 'yearly';

// portal_default_plan is server-validated to the paid plans only
type PortalDefaultPlan = Exclude<PortalPlan, 'free'>;

interface Price {
    amount?: unknown;
    currency?: unknown;
    [key: string]: unknown;
}

interface ValidPrice extends Price {
    amount: number;
    currency: string;
}

interface Product {
    id: string;
    type?: string;
    monthlyPrice?: Price | null;
    yearlyPrice?: Price | null;
}

// the slice of Portal's site data that gift purchasing reads
interface Site {
    paid_members_enabled?: boolean;
    portal_plans?: PortalPlan[];
    portal_products?: string[];
    products?: Product[];
}

function getPriceForDuration(product: Product, duration: GiftDuration): Price | null {
    if (duration === 12) {
        return product.yearlyPrice ?? null;
    }

    return product.monthlyPrice ?? null;
}

function hasValidPrice(price: Price | null): price is ValidPrice {
    return !!price
        && typeof price.amount === 'number'
        && Number.isSafeInteger(price.amount)
        && price.amount > 0
        && typeof price.currency === 'string'
        && !!price.currency;
}

function isDurationEnabled({portalPlans, duration}: {portalPlans: PortalPlan[]; duration: GiftDuration}): boolean {
    return duration === 12
        ? portalPlans.includes('yearly')
        : portalPlans.includes('monthly');
}

export function getGiftPrice(product: Product, duration: GiftDuration): ValidPrice | null {
    const price = getPriceForDuration(product, duration);

    if (!hasValidPrice(price)) {
        return null;
    }

    return {
        ...price,
        amount: duration === 12 ? price.amount : price.amount * duration
    };
}

export function getGiftProducts({site, duration}: {site: Site | null; duration: GiftDuration}): Product[] {
    const {
        paid_members_enabled: paidMembersEnabled,
        portal_plans: portalPlans = [],
        portal_products: portalProducts,
        products = []
    } = site || {};

    if (!paidMembersEnabled || !isDurationEnabled({portalPlans, duration})) {
        return [];
    }

    const portalProductIds = Array.isArray(portalProducts) ? portalProducts : null;

    return products.filter(product => (
        product?.type === 'paid'
        && (!portalProductIds || portalProductIds.includes(product.id))
        && !!getGiftPrice(product, duration)
    )).map(product => ({
        product,
        amount: getGiftPrice(product, duration)?.amount ?? 0
    })).sort((productA, productB) => (
        productA.amount - productB.amount
    )).map(({product}) => product);
}

export function getAvailableGiftDurations({site}: {site: Site | null}): GiftDuration[] {
    return GIFT_DURATION_CATALOGUE.filter(duration => getGiftProducts({site, duration}).length > 0);
}

export function getActiveGiftDuration({
    availableDurations,
    portalDefaultPlan,
    selectedDuration
}: {
    availableDurations: readonly GiftDuration[];
    portalDefaultPlan: PortalDefaultPlan | null;
    selectedDuration: GiftDuration | null;
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
