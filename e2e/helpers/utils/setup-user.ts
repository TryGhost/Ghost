import {appConfig} from './app-config';
import {UserFactory, User} from '../../data-factory/factories/user-factory';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const logging = require('@tryghost/logging');

export class GhostUserSetup {
    private readonly baseURL: string;
    private readonly headers: Record<string, string>;
    private readonly setupAuthEndpoint = '/ghost/api/admin/authentication/setup';

    constructor(baseURL: string) {
        this.baseURL = baseURL;
        this.headers = {'Content-Type': 'application/json'};
    }

    async setup(userOverrides: Partial<User> = {}): Promise<void> {
        if (await this.isSetupAlreadyCompleted()) {
            logging.info('Ghost user setup is already completed.');
            return;
        }

        const user = new UserFactory().build(userOverrides);
        await this.createUser(user);
    }

    private async isSetupAlreadyCompleted(): Promise<boolean> {
        const response = await this.makeRequest('GET');
        const data = await response.json();
        return data.setup?.[0]?.status === true;
    }

    private async createUser(user: User): Promise<void> {
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

export async function setupUser(baseGhostUrl: string, user: Partial<User> = {}): Promise<void> {
    const ghostUserSetup = new GhostUserSetup(baseGhostUrl);
    await ghostUserSetup.setup(user);
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
