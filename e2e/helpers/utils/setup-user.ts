import baseDebug from '@tryghost/debug';
import {User, UserFactory} from '../../data-factory/factories/user-factory';

const debug = baseDebug('e2e:helpers:utils:setup-user');

export class GhostUserSetup {
    private readonly baseURL: string;
    private readonly headers: Record<string, string>;
    private readonly setupAuthEndpoint = '/ghost/api/admin/authentication/setup';

    constructor(baseURL: string) {
        this.baseURL = baseURL;
        this.headers = {'Content-Type': 'application/json'};
    }

    async setup(userOverrides: Partial<User> = {}): Promise<void> {
        debug('setup-user called');
        if (await this.isSetupAlreadyCompleted()) {
            debug('Ghost user setup is already completed.');
            return;
        }

        const user = new UserFactory().build(userOverrides);
        await this.createUser(user);
    }

    private async isSetupAlreadyCompleted(): Promise<boolean> {
        const response = await this.makeRequest('GET');
        const data = await response.json();
        debug('Setup status response:', data);
        return data.setup?.[0]?.status === true;
    }

    private async createUser(user: User): Promise<void> {
        await this.makeRequest('POST', {setup: [user]});
        debug('Ghost user created successfully.');
    }

    private async makeRequest(method: 'GET' | 'POST', body?: unknown): Promise<Response> {
        const options: RequestInit = {method, headers: this.headers};

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${this.baseURL}${this.setupAuthEndpoint}`, options);

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Ghost setup ${method} failed (${response.status}): ${error}`);
        }

        return response;
    }
}

export async function setupUser(baseGhostUrl: string, user: Partial<User> = {}): Promise<void> {
    const ghostUserSetup = new GhostUserSetup(baseGhostUrl);
    await ghostUserSetup.setup(user);
}
