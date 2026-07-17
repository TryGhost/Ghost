import {faker} from "@faker-js/faker";
import {createBuilder} from "../factory";
import {generateId, generateSlug} from "../utils";

/** Ghost Admin API offer resource. */
export interface Offer {
    id: string;
    name: string;
    code: string;
    display_title: string;
    display_description: string;
    type: "percent" | "fixed" | "trial";
    cadence: "month" | "year";
    amount: number;
    duration: "once" | "repeating" | "forever" | "trial";
    duration_in_months: number | null;
    currency_restriction: boolean;
    currency: string | null;
    status: "active" | "archived";
    redemption_count: number;
    redemption_type: "signup" | "retention";
    tier: {id: string; name?: string} | null;
    created_at?: string;
    last_redeemed?: string;
}

/**
 * Defaults to an active signup percent-discount offer. `tier` is null — the
 * offers list drops signup rows whose tier isn't in the served tiers world,
 * so wire it explicitly: `offer({tier: {id: supporter.id, name: supporter.name}})`.
 */
export const offer = createBuilder<Offer>(() => {
    const offerName = faker.commerce.productAdjective() + " " + faker.commerce.product();

    return {
        id: generateId(),
        name: offerName,
        code: `${generateSlug(offerName)}-${faker.string.alphanumeric(6).toLowerCase()}`,
        display_title: offerName,
        display_description: "",
        type: "percent",
        cadence: "month",
        amount: 10,
        duration: "once",
        duration_in_months: null,
        currency_restriction: false,
        currency: null,
        status: "active",
        redemption_count: 0,
        redemption_type: "signup",
        tier: null,
        created_at: new Date().toISOString()
    };
});

/** Defaults to an active monthly retention offer (percent, forever, tierless). */
export const retentionOffer = createBuilder<Offer>(() => ({
    ...offer(),
    name: "Monthly retention",
    code: `monthly-retention-${faker.string.alphanumeric(6).toLowerCase()}`,
    display_title: "",
    display_description: "",
    amount: 20,
    duration: "forever",
    redemption_type: "retention"
}));
