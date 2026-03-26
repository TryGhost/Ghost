import {Factory} from '@/data-factory';
import {faker} from '@faker-js/faker';
import {generateId, generateSlug} from '@/data-factory';
import type {HttpClient, PersistenceAdapter} from '@/data-factory';
import type {Tier} from './member-factory';

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

export class TierFactory extends Factory<Partial<AdminTier>, AdminTier> {
    entityType = 'tiers';
    private readonly request?: HttpClient;

    constructor(adapter?: PersistenceAdapter, request?: HttpClient) {
        super(adapter);
        this.request = request;
    }

    build(options: Partial<AdminTier> = {}): AdminTier {
        const tierName = options.name ?? `Tier ${faker.commerce.productName()}`;
        const now = new Date();

        const defaults: AdminTier = {
            id: generateId(),
            name: tierName,
            slug: `${generateSlug(tierName)}-${faker.string.alphanumeric(6).toLowerCase()}`,
            type: 'paid',
            active: true,
            description: faker.lorem.sentence(),
            visibility: 'public',
            welcome_page_url: null,
            benefits: [],
            currency: 'usd',
            monthly_price: 500,
            yearly_price: 5000,
            trial_days: 0,
            created_at: now,
            updated_at: now
        };

        return {...defaults, ...options};
    }

    async getTiers(): Promise<AdminTier[]> {
        if (!this.request) {
            throw new Error('Cannot fetch tiers without an HTTP client. Use createTierFactory() for persisted test data access.');
        }

        const response = await this.request.get('/ghost/api/admin/tiers');
        if (!response.ok()) {
            throw new Error(`Failed to fetch tiers: ${response.status()}`);
        }

        const data = await response.json() as {tiers: AdminTier[]};
        return data.tiers;
    }

    async getPaidTiers(): Promise<AdminTier[]> {
        const tiers = await this.getTiers();
        return tiers.filter(tier => tier.type === 'paid' && tier.active);
    }

    async getFreeTier(): Promise<AdminTier | undefined> {
        const tiers = await this.getTiers();
        return tiers.find(tier => tier.type === 'free' && tier.active);
    }

    async getFirstPaidTier(): Promise<AdminTier> {
        const paidTiers = await this.getPaidTiers();
        if (paidTiers.length === 0) {
            throw new Error('No paid tiers found');
        }
        return paidTiers[0];
    }
}
