import type { Knex } from 'knex';

type ModelOptions = {
  context?: { internal?: boolean };
  transacting?: Knex.Transaction;
  forUpdate?: boolean;
};

type InviteModel = {
  get(key: 'expires'): number;
  get(key: 'email' | 'role_id'): string;
  destroy(options?: ModelOptions): Promise<unknown>;
};

/**
 * Partial declaration of the legacy registry API used by invite acceptance.
 * Imported explicitly so other registry consumers keep their existing types.
 * The JavaScript implementation is unchecked; acceptance-models.test.ts exercises
 * these operations against real models. Extend this only with verified usage.
 */
export type InviteAcceptanceModelRegistry = {
  Base: {
    transaction<T>(callback: (transacting: Knex.Transaction) => Promise<T>): Promise<T>;
  };
  Invite: {
    findOne(
      data: { token: string; status: 'sent' },
      options?: ModelOptions,
    ): Promise<InviteModel | null>;
  };
  User: {
    findOne(data: { email: string }, options?: ModelOptions): Promise<unknown>;
    add(
      data: { email: string; name: string; password: string; roles: string[] },
      options?: ModelOptions,
    ): Promise<unknown>;
  };
};
