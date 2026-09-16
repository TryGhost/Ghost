import { Factory } from '@/data-factory';
import { HttpClient } from '@/data-factory/persistence/adapters/http-client';
import { faker } from '@faker-js/faker';
import type { StaffRoleName } from '@tryghost/test-data';

export type AssignableStaffRoleName = Exclude<StaffRoleName, 'Owner'>;

export interface StaffAccount {
  name: string;
  email: string;
  password: string;
  role: AssignableStaffRoleName;
}

interface Role {
  id: string;
  name: StaffRoleName;
}

interface RolesResponse {
  roles: Role[];
}

export type InvitationTokenProvider = (email: string) => Promise<string>;

export class StaffAccountFactory extends Factory<Partial<StaffAccount>, StaffAccount> {
  entityType = 'staffAccounts';
  private readonly httpClient: HttpClient;
  private readonly getInvitationToken: InvitationTokenProvider;

  constructor(httpClient: HttpClient, getInvitationToken: InvitationTokenProvider) {
    super();
    this.httpClient = httpClient;
    this.getInvitationToken = getInvitationToken;
  }

  build(options: Partial<StaffAccount> = {}): StaffAccount {
    const role = options.role ?? 'Author';

    return {
      name: `Test ${role}`,
      email: `test-${role.toLowerCase().replace(' ', '-')}-${faker.string.uuid()}@ghost.org`,
      password: 'test@123@test',
      ...options,
      role,
    };
  }

  async create(options: Partial<StaffAccount> = {}): Promise<StaffAccount> {
    const staffAccount = this.build(options);
    const roleId = await this.getRoleId(staffAccount.role);

    await this.assertSuccessfulResponse(
      await this.httpClient.post('/ghost/api/admin/invites/', {
        data: {
          invites: [
            {
              email: staffAccount.email,
              role_id: roleId,
            },
          ],
        },
      }),
      `invite ${staffAccount.role}`,
    );

    const token = await this.getInvitationToken(staffAccount.email);
    await this.assertSuccessfulResponse(
      await this.httpClient.post('/ghost/api/admin/authentication/invitation/', {
        data: {
          invitation: [
            {
              token,
              name: staffAccount.name,
              email: staffAccount.email,
              // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
              password: staffAccount.password,
            },
          ],
        },
      }),
      `accept invitation for ${staffAccount.role}`,
    );

    return staffAccount;
  }

  async createMany(optionsList: Partial<StaffAccount>[]): Promise<StaffAccount[]> {
    const staffAccounts: StaffAccount[] = [];

    for (const options of optionsList) {
      staffAccounts.push(await this.create(options));
    }

    return staffAccounts;
  }

  private async getRoleId(roleName: AssignableStaffRoleName): Promise<string> {
    const response = await this.httpClient.get('/ghost/api/admin/roles/?permissions=assign');
    await this.assertSuccessfulResponse(response, 'load assignable staff roles');

    const { roles } = (await response.json()) as RolesResponse;
    const role = roles.find(({ name }) => name === roleName);

    if (!role) {
      throw new Error(`Unable to find assignable staff role: ${roleName}`);
    }

    return role.id;
  }

  private async assertSuccessfulResponse(
    response: Awaited<ReturnType<HttpClient['get']>>,
    action: string,
  ): Promise<void> {
    if (!response.ok()) {
      throw new Error(`Failed to ${action}: ${response.status()} ${await response.text()}`);
    }
  }
}
