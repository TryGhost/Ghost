import {Factory} from '@/data-factory';
import {faker} from '@faker-js/faker';
import {generateSlug} from '@/data-factory';
import {tier} from '@tryghost/test-data';
import type {Tier as CanonicalTier} from '@tryghost/test-data';
import type {HttpClient, PersistenceAdapter} from '@/data-factory';
import type {Tier} from './member-factory';

/**
 * The *write/create* shape POSTed to /ghost/api/admin/tiers/ (Date objects
 * for timestamps). The canonical *response* shape lives in
 * `@tryghost/test-data`; `build()` derives this payload from it.
 */
export interface AdminTier extends Tier {
    description?: string | null;
    visibility?: 'public' | 'none';
    welcome_page_url?: string | null;
    benefits?: string[] | null;
    currency?: string;
    monthly_price?: number;
    yearly_price?: number;
    trial_days?: number;
    created_at?: Date;
    updated_at?: Date | null;
}

export interface TierCreateInput {
    name: string;
    description?: string;
    visibility?: 'public' | 'none';
    welcome_page_url?: string;
    benefits?: string[];
    currency: string;
    monthly_price: number;
    yearly_price: number;
    trial_days?: number;
}

/**
 * Derive the create payload from the canonical API response shape:
 * ISO-string dates become Date objects (serialized back on POST); every
 * other field maps 1:1 — the tiers write lane accepts the response fields.
 */
function toCreatePayload(canonical: CanonicalTier): AdminTier {
    return {
        id: canonical.id,
        name: canonical.name,
        slug: canonical.slug,
        type: canonical.type,
        active: canonical.active,
        description: canonical.description,
        visibility: canonical.visibility,
        welcome_page_url: canonical.welcome_page_url,
        benefits: canonical.benefits,
        currency: canonical.currency,
        monthly_price: canonical.monthly_price,
        yearly_price: canonical.yearly_price,
        trial_days: canonical.trial_days,
        created_at: new Date(canonical.created_at),
        updated_at: new Date(canonical.updated_at)
    };
}

export class TierFactory extends Factory<Partial<AdminTier>, AdminTier> {
    entityType = 'tiers';
    private readonly request?: HttpClient;

    constructor(adapter?: PersistenceAdapter, request?: HttpClient) {
        super(adapter);
        this.request = request;
    }

    build(options: Partial<AdminTier> = {}): AdminTier {
        // Canonical response default is a null description; the write lane
        // keeps seeding one (pre-rewire behavior).
        const canonical = tier({description: faker.lorem.sentence()});
        const name = options.name ?? canonical.name;

        const defaults: AdminTier = {
            ...toCreatePayload(canonical),
            name,
            slug: `${generateSlug(name)}-${faker.string.alphanumeric(6).toLowerCase()}`
        };

        return {...defaults, ...options};
    }

    async getFirstPaidTier(): Promise<AdminTier> {
        if (!this.request) {
            throw new Error('Cannot fetch tiers without an HTTP client. Use createTierFactory() for persisted test data access.');
        }

        const response = await this.request.get('/ghost/api/admin/tiers');
        if (!response.ok()) {
            throw new Error(`Failed to fetch tiers: ${response.status()}`);
        }

        const {tiers} = await response.json() as {tiers: AdminTier[]};
        const paidTier = tiers.find(candidate => candidate.type === 'paid' && candidate.active);
        if (!paidTier) {
            throw new Error('No paid tiers found');
        }
        return paidTier;
    }
}
