import {Factory, generateId, generateSlug} from '@/data-factory';
import {faker} from '@faker-js/faker';
import type {HttpClient, PersistenceAdapter} from '@/data-factory';

export interface AdminOffer {
    id: string;
    name: string;
    code: string;
    cadence: 'month' | 'year';
    redemption_type?: 'signup' | 'retention';
    status: 'active' | 'archived';
    display_title: string | null;
    display_description: string | null;
    type: 'fixed' | 'percent' | 'trial';
    amount: number;
    duration: 'once' | 'repeating' | 'forever' | 'trial';
    duration_in_months: number | null;
    currency: string | null;
    stripe_coupon_id?: string | null;
    tier: {
        id: string;
    } | null;
}

export interface OfferCreateInput {
    [key: string]: unknown;
    name: string;
    code: string;
    cadence: 'month' | 'year';
    amount: number;
    duration: 'once' | 'repeating' | 'forever' | 'trial';
    type: 'fixed' | 'percent' | 'trial';
    tierId?: string | null;
    currency?: string | null;
    display_title?: string | null;
    display_description?: string | null;
    duration_in_months?: number | null;
    redemption_type?: 'signup' | 'retention';
    status?: 'active' | 'archived';
}

export interface OfferUpdateInput {
    status?: 'active' | 'archived';
}

export class OfferFactory extends Factory<OfferCreateInput, AdminOffer> {
    entityType = 'offers';
    private readonly request?: HttpClient;

    constructor(adapter?: PersistenceAdapter, request?: HttpClient) {
        super(adapter);
        this.request = request;
    }

    build(options: Partial<OfferCreateInput> = {}): AdminOffer {
        const name = options.name ?? `Offer ${faker.commerce.productName()}`;
        const code = options.code ?? `${generateSlug(name)}-${faker.string.alphanumeric(6).toLowerCase()}`;
        const redemptionType = options.redemption_type ?? (options.tierId ? 'signup' : 'retention');

        return {
            id: generateId(),
            name,
            code,
            cadence: options.cadence ?? 'month',
            redemption_type: redemptionType,
            status: options.status ?? 'active',
            display_title: options.display_title ?? name,
            display_description: options.display_description ?? null,
            type: options.type ?? 'percent',
            amount: options.amount ?? 10,
            duration: options.duration ?? 'once',
            duration_in_months: options.duration_in_months ?? null,
            currency: options.currency ?? null,
            stripe_coupon_id: null,
            tier: options.tierId ? {id: options.tierId} : null
        };
    }

    async create(options: Partial<OfferCreateInput> = {}): Promise<AdminOffer> {
        if (!this.request) {
            throw new Error('Cannot create without an HTTP client. Use createOfferFactory() for persisted test data access.');
        }

        const offer = this.build(options);
        const response = await this.request.post('/ghost/api/admin/offers', {
            data: {
                offers: [{
                    name: offer.name,
                    code: offer.code,
                    cadence: offer.cadence,
                    status: offer.status,
                    redemption_type: offer.redemption_type ?? 'signup',
                    currency: offer.currency,
                    type: offer.type,
                    amount: offer.amount,
                    duration: offer.duration,
                    duration_in_months: offer.duration_in_months,
                    display_title: offer.display_title,
                    display_description: offer.display_description,
                    tier: offer.tier
                }]
            }
        });

        return await this.extractFirstOfferOrThrow('create offer', response.status(), response);
    }

    async update(id: string, input: OfferUpdateInput): Promise<AdminOffer> {
        if (!this.request) {
            throw new Error('Cannot update without an HTTP client. Use createOfferFactory() for persisted test data access.');
        }

        const response = await this.request.put(`/ghost/api/admin/offers/${id}`, {
            data: {
                offers: [input]
            }
        });

        return await this.extractFirstOfferOrThrow('update offer', response.status(), response);
    }

    async getOffers(): Promise<AdminOffer[]> {
        if (!this.request) {
            throw new Error('Cannot fetch offers without an HTTP client. Use createOfferFactory() for persisted test data access.');
        }

        const response = await this.request.get('/ghost/api/admin/offers');
        if (!response.ok()) {
            throw new Error(`Failed to fetch offers: ${response.status()}`);
        }

        const data = await response.json() as {offers: AdminOffer[]};
        return data.offers;
    }

    async getById(id: string): Promise<AdminOffer> {
        if (!this.request) {
            throw new Error('Cannot fetch an offer without an HTTP client. Use createOfferFactory() for persisted test data access.');
        }

        const response = await this.request.get(`/ghost/api/admin/offers/${id}`);
        return await this.extractFirstOfferOrThrow('fetch offer', response.status(), response);
    }

    private async extractFirstOfferOrThrow(action: string, status: number, response: {ok(): boolean; json(): Promise<unknown>}): Promise<AdminOffer> {
        if (!response.ok()) {
            throw new Error(`Failed to ${action}: ${status}`);
        }

        const data = await response.json() as {offers?: AdminOffer[]};
        const offers = data.offers;

        if (!Array.isArray(offers) || offers.length === 0) {
            let responseBody = '[unserializable]';

            try {
                responseBody = JSON.stringify(data);
            } catch {
                // Ignore serialization errors and keep fallback marker.
            }

            throw new Error(
                `Failed to ${action}: expected response.offers to be a non-empty array (status ${status}). Response: ${responseBody}`
            );
        }

        return offers[0];
    }
}
