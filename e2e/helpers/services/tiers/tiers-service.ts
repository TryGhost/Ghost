import {HttpClient as APIRequest, Tier} from '@/data-factory';

// TODO: Convert this helper into a TierFactory-backed setup API instead of keeping
// thin admin CRUD wrappers under helpers/services. Tiers are Ghost test data, so
// they fit the data-factory model better than the service layer.

export interface AdminTier extends Tier {
    description?: string | null;
    visibility?: 'public' | 'none';
    welcome_page_url?: string | null;
    benefits?: string[] | null;
    currency?: string;
    monthly_price?: number;
    yearly_price?: number;
    trial_days?: number;
}

export interface TiersResponse {
    tiers: AdminTier[];
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

export class TiersService {
    private readonly request: APIRequest;
    private readonly adminEndpoint: string;

    constructor(request: APIRequest) {
        this.request = request;
        this.adminEndpoint = '/ghost/api/admin';
    }

    async getTiers(): Promise<AdminTier[]> {
        const response = await this.request.get(`${this.adminEndpoint}/tiers`);
        const data = await response.json() as TiersResponse;
        return data.tiers;
    }

    async createTier(input: TierCreateInput): Promise<AdminTier> {
        const response = await this.request.post(`${this.adminEndpoint}/tiers`, {
            data: {
                tiers: [input]
            }
        });
        const data = await response.json() as TiersResponse;
        return data.tiers[0];
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
