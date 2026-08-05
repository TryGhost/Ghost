import {Factory} from '@/data-factory';
import {HttpClient} from '@/data-factory/persistence/adapters/http-client';
import {faker} from '@faker-js/faker';

export type StaffRole = 'Author' | 'Contributor';

export interface StaffUser {
    name: string;
    email: string;
    password: string;
    role: StaffRole;
}

interface Role {
    id: string;
    name: string;
}

interface RolesResponse {
    roles: Role[];
}

export type InvitationTokenProvider = (email: string) => Promise<string>;

export class StaffUserFactory extends Factory<Partial<StaffUser>, StaffUser> {
    entityType = 'staffUsers';
    private readonly httpClient: HttpClient;
    private readonly getInvitationToken: InvitationTokenProvider;

    constructor(
        httpClient: HttpClient,
        getInvitationToken: InvitationTokenProvider
    ) {
        super();
        this.httpClient = httpClient;
        this.getInvitationToken = getInvitationToken;
    }

    build(options: Partial<StaffUser> = {}): StaffUser {
        const role = options.role ?? 'Author';

        return {
            name: `Test ${role}`,
            email: `test-${role.toLowerCase()}-${faker.string.uuid()}@ghost.org`,
            password: 'test@123@test',
            ...options,
            role
        };
    }

    async create(options: Partial<StaffUser> = {}): Promise<StaffUser> {
        const staffUser = this.build(options);
        const roleId = await this.getRoleId(staffUser.role);

        await this.assertSuccessfulResponse(
            await this.httpClient.post('/ghost/api/admin/invites/', {
                data: {
                    invites: [{
                        email: staffUser.email,
                        role_id: roleId
                    }]
                }
            }),
            `invite ${staffUser.role}`
        );

        const token = await this.getInvitationToken(staffUser.email);
        await this.assertSuccessfulResponse(
            await this.httpClient.post('/ghost/api/admin/authentication/invitation/', {
                data: {
                    invitation: [{
                        token,
                        name: staffUser.name,
                        email: staffUser.email,
                        password: staffUser.password
                    }]
                }
            }),
            `accept invitation for ${staffUser.role}`
        );

        return staffUser;
    }

    private async getRoleId(roleName: StaffRole): Promise<string> {
        const response = await this.httpClient.get('/ghost/api/admin/roles/?permissions=assign');
        await this.assertSuccessfulResponse(response, 'load assignable staff roles');

        const {roles} = await response.json() as RolesResponse;
        const role = roles.find(({name}) => name === roleName);

        if (!role) {
            throw new Error(`Unable to find assignable staff role: ${roleName}`);
        }

        return role.id;
    }

    private async assertSuccessfulResponse(response: Awaited<ReturnType<HttpClient['get']>>, action: string): Promise<void> {
        if (!response.ok()) {
            throw new Error(`Failed to ${action}: ${response.status()} ${await response.text()}`);
        }
    }
}
