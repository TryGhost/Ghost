import {HttpClient as APIRequest, Member} from '@/data-factory';

export interface MembersResponse {
    members: Member[];
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
}
