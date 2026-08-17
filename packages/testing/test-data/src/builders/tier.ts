import {faker} from "@faker-js/faker";
import {createBuilder} from "../factory";
import {generateId, generateSlug} from "../utils";

/** Ghost Admin API tier resource. */
export interface Tier {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    active: boolean;
    type: "free" | "paid";
    welcome_page_url: string | null;
    visibility: "public" | "none";
    trial_days: number;
    currency?: string;
    monthly_price?: number;
    yearly_price?: number;
    benefits: string[];
    created_at: string;
    updated_at: string;
}

export const tier = createBuilder<Tier>(() => {
    const now = new Date().toISOString();
    const name = `${faker.commerce.productAdjective()} Tier`;

    return {
        id: generateId(),
        name,
        slug: `${generateSlug(name)}-${faker.string.alphanumeric(6).toLowerCase()}`,
        description: null,
        active: true,
        type: "paid",
        welcome_page_url: null,
        visibility: "public",
        trial_days: 0,
        currency: "usd",
        monthly_price: 500,
        yearly_price: 5000,
        benefits: [],
        created_at: now,
        updated_at: now
    };
});
