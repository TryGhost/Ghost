import * as errors from '@tryghost/errors';
import { z } from 'zod';
import type { AcceptanceModels } from './accept';

function property(value: unknown, key: string): unknown {
  if ((typeof value !== 'object' || value === null) && typeof value !== 'function') {
    throw new errors.IncorrectUsageError({ message: `Missing invite model property: ${key}` });
  }
  return Reflect.get(value, key);
}

function method(receiver: unknown, key: string): (...args: unknown[]) => unknown {
  const value = property(receiver, key);
  if (typeof value !== 'function') {
    throw new errors.IncorrectUsageError({ message: `Missing invite model method: ${key}` });
  }
  return (...args) => Reflect.apply(value, receiver, args);
}

/** Check the legacy values used by AcceptanceModels without declaring the shared registry typed. */
export function createAcceptanceModels(models: unknown): AcceptanceModels {
  const transaction = method(property(models, 'Base'), 'transaction');
  const findInvite = method(property(models, 'Invite'), 'findOne');
  const users = property(models, 'User');
  const findUser = method(users, 'findOne');
  const addUser = method(users, 'add');

  return {
    Base: {
      async transaction<T>(callback: (transacting: unknown) => Promise<T>): Promise<T> {
        let completed: { value: T } | undefined;
        await transaction(async (transacting: unknown) => {
          completed = { value: await callback(transacting) };
          return completed.value;
        });
        if (!completed) {
          throw new errors.IncorrectUsageError({
            message: 'Invite transaction did not run its callback',
          });
        }
        return completed.value;
      },
    },
    Invite: {
      async findOne(data, options) {
        const invite = await findInvite(data, options);
        if (invite === null) {
          return null;
        }
        const read = method(invite, 'get');
        const destroy = method(invite, 'destroy');

        function get(key: 'expires'): number;
        function get(key: 'email' | 'role_id'): string;
        function get(key: 'expires' | 'email' | 'role_id') {
          const value = read(key);
          return key === 'expires' ? z.number().parse(value) : z.string().parse(value);
        }

        return {
          get,
          async destroy(destroyOptions) {
            return await destroy(destroyOptions);
          },
        };
      },
    },
    User: {
      async findOne(data, options) {
        return await findUser(data, options);
      },
      async add(data, options) {
        return await addUser(data, options);
      },
    },
  };
}
