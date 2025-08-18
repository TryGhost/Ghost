import {appConfig} from './app-config';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const logging = require('@tryghost/logging');

export interface GhostUser {
    name: string;
    email: string;
    password: string;
    blogTitle: string;
}

export class GhostUserSetup {
    private readonly baseURL: string;
    private readonly headers: Record<string, string>;
    private readonly setupAuthEndpoint = '/ghost/api/admin/authentication/setup';

    constructor(baseURL: string) {
        this.baseURL = baseURL;
        this.headers = {'Content-Type': 'application/json'};
    }

    async setupFirstUser(userOverrides: Partial<GhostUser> = {}): Promise<void> {
        if (await this.setupIsAlreadyCompleted()) {
            logging.info('Ghost user setup is already completed.');
            return;
        }

        const user = this.buildUser(userOverrides);
        await this.createUser(user);
    }

    private async setupIsAlreadyCompleted(): Promise<boolean> {
        const response = await this.makeRequest('GET');
        const data = await response.json();
        return data.setup?.[0]?.status === true;
    }

    private buildUser(overrides: Partial<GhostUser>): GhostUser {
        return {
            name: 'Test Admin',
            email: 'test@example.com',
            password: 'test123',
            blogTitle: 'Test Blog',
            ...overrides
        };
    }

    private async createUser(user: GhostUser): Promise<void> {
        await this.makeRequest('POST', {setup: [user]});
        logging.info('Ghost user created successfully.');
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

export async function setupUser(baseGhostUrl: string, userOverrides: Partial<GhostUser> = {}): Promise<void> {
    const setup = new GhostUserSetup(baseGhostUrl);
    await setup.setupFirstUser(userOverrides);
}

export default setupUser;

// Execute only when run directly
if (require.main === module) {
    setupUser(appConfig.baseURL, {email: appConfig.auth.email, password: appConfig.auth.password})
        .catch((error) => {
            logging.error('Ghost user setup failed:', error.message);
            process.exit(1);
        });
}
