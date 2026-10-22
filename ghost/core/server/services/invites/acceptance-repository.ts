import * as errors from '@tryghost/errors';
import { z } from 'zod';

const inviteAttributes = z.object({
  expires: z.number(),
  email: z.string(),
  roleId: z.string(),
});

export type SentInvite = z.infer<typeof inviteAttributes> & {
  consume(): Promise<void>;
};

export type AcceptanceTransaction = {
  findSentInvite(token: string): Promise<SentInvite | null>;
  userExists(email: string): Promise<boolean>;
  addUser(data: { email: string; name: string; password: string; roles: string[] }): Promise<void>;
};

export type AcceptanceRepository = {
  /** The transaction's operations and returned invitations must stay inside this callback. */
  transaction(callback: (transaction: AcceptanceTransaction) => Promise<void>): Promise<void>;
};

function getProperty(value: unknown, key: string): unknown {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') {
    throw new errors.IncorrectUsageError({ message: `Missing invite model property: ${key}` });
  }
  return Reflect.get(value, key);
}

function bindMethod(receiver: unknown, key: string): (...args: unknown[]) => unknown {
  const method = getProperty(receiver, key);
  if (typeof method !== 'function') {
    throw new errors.IncorrectUsageError({ message: `Missing invite model method: ${key}` });
  }
  return (...args) => Reflect.apply(method, receiver, args);
}

/**
 * Keep unchecked legacy model calls here. Validate their data before exposing
 * it to acceptance; this does not declare the JavaScript implementation typed.
 */
export function createAcceptanceRepository(models: unknown): AcceptanceRepository {
  const transaction = bindMethod(getProperty(models, 'Base'), 'transaction');
  const findInvite = bindMethod(getProperty(models, 'Invite'), 'findOne');
  const users = getProperty(models, 'User');
  const findUser = bindMethod(users, 'findOne');
  const addUser = bindMethod(users, 'add');

  return {
    async transaction(callback) {
      await transaction(async (transacting: unknown) => {
        const options = { context: { internal: true }, transacting, forUpdate: true };

        await callback({
          async findSentInvite(token) {
            const invite = await findInvite({ token, status: 'sent' }, options);
            if (invite === null) {
              return null;
            }

            const get = bindMethod(invite, 'get');
            const destroy = bindMethod(invite, 'destroy');
            const attributes = inviteAttributes.parse({
              expires: get('expires'),
              email: get('email'),
              roleId: get('role_id'),
            });

            return {
              ...attributes,
              async consume() {
                await destroy(options);
              },
            };
          },
          async userExists(email) {
            return Boolean(await findUser({ email }, options));
          },
          async addUser(data) {
            await addUser(data, options);
          },
        });
      });
    },
  };
}
