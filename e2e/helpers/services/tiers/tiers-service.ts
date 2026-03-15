import {HttpClient as APIRequest, Tier} from '@/data-factory';

export interface TiersResponse {
    tiers: Tier[];
}

export class TiersService {
    private readonly request: APIRequest;
    private readonly adminEndpoint: string;

    constructor(request: APIRequest) {
        this.request = request;
        this.adminEndpoint = '/ghost/api/admin';
    }

    async getTiers(): Promise<Tier[]> {
        const response = await this.request.get(`${this.adminEndpoint}/tiers`);
        const data = await response.json() as TiersResponse;
        return data.tiers;
    }

    async getPaidTiers(): Promise<Tier[]> {
        const tiers = await this.getTiers();
        return tiers.filter(tier => tier.type === 'paid' && tier.active);
    }

    async getFreeTier(): Promise<Tier | undefined> {
        const tiers = await this.getTiers();
        return tiers.find(tier => tier.type === 'free' && tier.active);
    }

    async getFirstPaidTier(): Promise<Tier> {
        const paidTiers = await this.getPaidTiers();
        if (paidTiers.length === 0) {
            throw new Error('No paid tiers found');
        }
        return paidTiers[0];
    }
}
