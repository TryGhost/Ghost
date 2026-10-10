import type { Knex } from 'knex';
import { expectTypeOf, it } from 'vitest';
import type { CheckOptions, CurrentCountQuery, Db, MaxLimit, MaxPeriodicLimit } from '../src/index.ts';

it('accepts real Knex connections and transactions', () => {
  expectTypeOf<Knex>().toExtend<NonNullable<Db['knex']>>();
  expectTypeOf<Knex.Transaction>().toExtend<NonNullable<Db['knex']>>();
  expectTypeOf<Knex.Transaction>().toExtend<NonNullable<CheckOptions['transacting']>>();
});

it('requires callers to handle nonnumeric count results', () => {
  expectTypeOf<Awaited<ReturnType<CurrentCountQuery>>>().not.toExtend<number>();
  expectTypeOf<Awaited<ReturnType<MaxLimit['currentCountQuery']>>>().not.toExtend<number>();
  expectTypeOf<Awaited<ReturnType<MaxPeriodicLimit['currentCountQuery']>>>().not.toExtend<number>();
});
