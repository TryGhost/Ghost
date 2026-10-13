import type { Knex } from 'knex';
import { createDatabaseAutomationsRepository2 } from '../../../../core/server/services/automations/database-automations-repository-2';
// @ts-expect-error This module lacks type definitions.
import testUtils from '../../../utils';
// @ts-expect-error This module lacks type definitions.
import * as dbUtils from '../../../utils/db-utils';

describe('database automations repository', function () {
  const knex: Knex = testUtils.knex;

  beforeAll(async function () {
    await dbUtils.reset({ truncate: true });
    await testUtils.setup('default')();
  });

  describe('alphabetical key order', function () {
    it('keeps its keys in alphabetical order for consistency', function () {
      const repository = createDatabaseAutomationsRepository2({ knex });

      const actual = Object.keys(repository);
      const expected = actual.toSorted();

      expect(actual).toEqual(expected);
    });
  });

  describe('getNumberOfAutomations', function () {
    it('returns the number of automations', async function () {
      const repository = createDatabaseAutomationsRepository2({ knex });

      const result = await repository.withConnection((connection) =>
        repository.getNumberOfAutomations(connection),
      );

      expect(result).toBe(0);
    });
  });

  describe('withConnection', function () {
    it('runs the callback and returns the result', async function () {
      const repository = createDatabaseAutomationsRepository2({ knex });

      const result = await repository.withConnection(async (connection) => {
        const row = await knex.select(knex.raw("'foo bar' as value")).first();
        return row.value;
      });

      expect(result).toBe('foo bar');
    });
  });
});
