import {HttpClient as APIRequest} from '@/data-factory';

// TODO: Convert this helper into an OfferFactory-backed setup API instead of keeping
// thin admin CRUD wrappers under helpers/services. Offers are Ghost test data, so
// they fit the data-factory model better than the service layer.

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

export interface OffersResponse {
    offers: AdminOffer[];
}

export interface OfferCreateInput {
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

export class OffersService {
    private readonly request: APIRequest;
    private readonly adminEndpoint: string;

    constructor(request: APIRequest) {
        this.request = request;
        this.adminEndpoint = '/ghost/api/admin';
    }

    private extractFirstOfferOrThrow(action: string, status: number, data: unknown): AdminOffer {
        const offers = (data as OffersResponse | undefined)?.offers;

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

    async createOffer(input: OfferCreateInput): Promise<AdminOffer> {
        const response = await this.request.post(`${this.adminEndpoint}/offers`, {
            data: {
                offers: [{
                    name: input.name,
                    code: input.code,
                    cadence: input.cadence,
                    status: input.status ?? 'active',
                    redemption_type: input.redemption_type ?? 'signup',
                    currency: input.currency ?? null,
                    type: input.type,
                    amount: input.amount,
                    duration: input.duration,
                    duration_in_months: input.duration_in_months ?? null,
                    display_title: input.display_title ?? input.name,
                    display_description: input.display_description ?? null,
                    tier: input.tierId ? {id: input.tierId} : null
                }]
            }
        });

        if (!response.ok()) {
            throw new Error(`Failed to create offer: ${response.status()}`);
        }

        const data = await response.json() as unknown;
        return this.extractFirstOfferOrThrow('create offer', response.status(), data);
    }

    async updateOffer(offerId: string, input: OfferUpdateInput): Promise<AdminOffer> {
        const response = await this.request.put(`${this.adminEndpoint}/offers/${offerId}`, {
            data: {
                offers: [input]
            }
        });

        if (!response.ok()) {
            throw new Error(`Failed to update offer: ${response.status()}`);
        }

        const data = await response.json() as unknown;
        return this.extractFirstOfferOrThrow('update offer', response.status(), data);
    }
}
