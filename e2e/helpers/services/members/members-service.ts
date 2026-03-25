import {HttpClient as APIRequest, Member} from '@/data-factory';

export interface MemberSubscription {
    id: string;
    status: string;
    cancel_at_period_end: boolean;
    current_period_end: string;
    start_date: string;
    default_payment_card_last4: string | null;
    plan: {
        id: string;
        nickname: string | null;
        amount: number;
        currency: string;
        interval: string;
    };
    offer?: {
        id: string;
        amount: number;
        duration: 'once' | 'repeating' | 'forever' | 'trial';
        duration_in_months: number | null;
        type: 'fixed' | 'percent' | 'trial';
    } | null;
    offer_redemptions?: Array<{id: string}>;
    next_payment?: {
        original_amount: number;
        amount: number;
        interval: string;
        currency: string;
        discount: {
            offer_id: string;
            duration: 'once' | 'repeating' | 'forever';
            duration_in_months: number | null;
            type: 'fixed' | 'percent';
            amount: number;
        } | null;
    } | null;
}

export interface MemberWithSubscriptions extends Member {
    subscriptions: MemberSubscription[];
}

export interface MembersResponse {
    members: Member[];
}

export interface MembersWithSubscriptionsResponse {
    members: MemberWithSubscriptions[];
}

export class MembersService {
    private readonly request: APIRequest;
    private readonly adminEndpoint: string;

    constructor(request: APIRequest) {
        this.request = request;
        this.adminEndpoint = '/ghost/api/admin';
    }

    async getByEmail(email: string): Promise<Member> {
        const response = await this.request.get(
            `${this.adminEndpoint}/members/?filter=email:'${email}'`
        );
        if (!response.ok()) {
            throw new Error(`Failed to fetch member: ${response.status()}`);
        }
        const data = await response.json() as MembersResponse;
        if (!data.members || data.members.length === 0) {
            throw new Error(`Member not found with email: ${email}`);
        }
        return data.members[0];
    }

    async getByEmailWithSubscriptions(email: string): Promise<MemberWithSubscriptions> {
        const response = await this.request.get(
            `${this.adminEndpoint}/members/?filter=email:'${email}'&include=subscriptions`
        );
        if (!response.ok()) {
            throw new Error(`Failed to fetch member: ${response.status()}`);
        }
        const data = await response.json() as MembersWithSubscriptionsResponse;
        if (!data.members || data.members.length === 0) {
            throw new Error(`Member not found with email: ${email}`);
        }
        return data.members[0];
    }
}
