import { type Knex } from 'knex';
import type { AutomationsRepository2 } from './automations-repository-2';

type Connection = Knex | Knex.Transaction;

/**
 * Create a database-backed automations repository. See `AutomationsRepository2`
 * for details on what should (and should not) be in here.
 *
 * NOTE: `createDatabaseAutomationsRepository2` will soon subsume `createDatabaseAutomationsRepository`. See NY-1704.
 */
export const createDatabaseAutomationsRepository2 = ({
  knex,
}: Readonly<{
  knex: Knex;
}>) => {
  return {
    async getNumberOfAutomations(connection) {
      const result = await connection('automations').count({ count: '*' }).first();
      return Number(result?.count ?? 0);
    },

    withConnection: (fn) => fn(knex),
  } satisfies AutomationsRepository2<Connection>;
};
