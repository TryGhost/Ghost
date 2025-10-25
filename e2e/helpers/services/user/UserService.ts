import {HttpClient as APIRequest} from '../../../data-factory/persistence/adapters/http-client';

export interface UserAccessibility {
    whatsNew?: {
        lastSeenDate: string;
    };
    [key: string]: unknown;
}

export interface UserResponse {
    users: Array<{
        id: string;
        accessibility: string | null;
        [key: string]: unknown;
    }>;
}

export class UserService {
    private readonly request: APIRequest;
    private readonly adminEndpoint: string;

    constructor(request: APIRequest) {
        this.request = request;
        this.adminEndpoint = '/ghost/api/admin';
    }

    async updateCurrentUserAccessibility(accessibility: UserAccessibility): Promise<void> {
        const data = {
            users: [{
                accessibility: JSON.stringify(accessibility)
            }]
        };

        await this.request.put(`${this.adminEndpoint}/users/me/`, {data});
    }
}
