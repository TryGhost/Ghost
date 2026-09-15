import type { Knex } from 'knex';
import { expectTypeOf, it } from 'vitest';
import { readHostSettings, LimitService } from '../src/index.ts';
import type { CheckOptions, ErrorsModule, CurrentCountQuery, Db, LimitName, MaxLimit, MaxPeriodicLimit } from '../src/index.ts';

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

it('only accepts limit names the manifest declares', () => {
  const service = new LimitService({ settings: readHostSettings({}).settings, errors: {} as ErrorsModule });

  expectTypeOf(service.isLimited).parameter(0).toEqualTypeOf<LimitName>();
  expectTypeOf<'customThemes'>().toExtend<LimitName>();
  expectTypeOf<'limitCustomFields'>().toExtend<LimitName>();

  // A name nothing declares is not a limit name, however plausible it looks.
  expectTypeOf<'custom_themes'>().not.toExtend<LimitName>();
  expectTypeOf<'aLimitNobodyShipped'>().not.toExtend<LimitName>();
});
