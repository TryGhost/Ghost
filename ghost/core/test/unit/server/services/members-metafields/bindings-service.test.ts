import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { MetafieldBindingsService } from '../../../../../core/server/services/members-metafields/bindings-service';

// What a port resolves to. Every port here resolves to the same field, because where a
// value lands is not what any of these are about.
const BOUND_ROW = {
  binding_id: 'binding_1',
  namespace: 'custom',
  key: 'delivery_address',
  type: 'short_text',
};

/**
 * A stand-in for the query that resolves a port to the field it was bound to.
 *
 * Faked rather than run, because the resolving is not what is under test: these cover
 * what the service does with a value once it knows where the value goes.
 */
const knexReturning = (row: unknown) => {
  const chain = {
    join: () => chain,
    where: () => chain,
    select: () => chain,
    first: async () => row,
  };
  return (() => chain) as never;
};

/** Values the stubbed catalog refuses, named so a test can tell two refusals apart. */
const REFUSED = /^refuse:/;

/** Refuses anything named as refusable, and plans everything else as the value itself. */
const values = {
  planWrite: async (input: Record<string, unknown>) => {
    const refused = Object.values(input).find(
      (value) => typeof value === 'string' && REFUSED.test(value),
    );
    if (refused !== undefined) {
      throw new Error(`the catalog refused ${refused}`);
    }
    return Object.values(input).map((value) => ({ value }));
  },
} as never;

const serviceResolving = (row: unknown = BOUND_ROW) =>
  new MetafieldBindingsService({ knex: knexReturning(row), values });

const ADDRESS = { port: 'shipping_address', value: '1 High Street' };

describe('MetafieldBindingsService', function () {
  // Which of these a caller reaches for is how it states where a value came from, so
  // there is no writer to pass, and none to get wrong.
  describe('planCollected', function () {
    it('names the binding that routed the value as its writer', async function () {
      const { plans, failure } = await serviceResolving().planCollected('tier_1', [ADDRESS]);

      // The id resolves back to the tier that asked and the field it landed in, which
      // is why only the service can supply it.
      assert.equal(failure, undefined);
      assert.deepEqual(
        plans.map((plan) => plan.origin),
        [{ writtenBy: { type: 'binding', id: 'binding_1' }, source: 'checkout' }],
      );
    });

    it('plans every value it can while reporting a refused one', async function () {
      const { plans, failure } = await serviceResolving().planCollected('tier_1', [
        { port: 'question', value: 'refuse:the answer' },
        ADDRESS,
      ]);

      // The values have nothing to do with each other, so the good one is still planned.
      assert.match(String(failure), /refused refuse:the answer/);
      assert.deepEqual(
        plans.map((plan) => plan.writes),
        [[{ value: '1 High Street' }]],
      );
    });

    it('plans later values when working out where one of them goes fails', async function () {
      let lookups = 0;
      const chain = {
        join: () => chain,
        where: () => chain,
        select: () => chain,
        first: async () => {
          lookups += 1;
          if (lookups === 1) {
            throw new Error('the lookup failed');
          }
          return BOUND_ROW;
        },
      };
      const service = new MetafieldBindingsService({ knex: (() => chain) as never, values });

      // Finding where a value goes is a database query, and it can fail the way checking
      // one can. Neither is a reason to give up on the values either side of it.
      const { plans, failure } = await service.planCollected('tier_1', [
        { port: 'question', value: 'x' },
        ADDRESS,
      ]);

      assert.match(String(failure), /the lookup failed/);
      assert.equal(plans.length, 1, 'the value whose port did resolve was still planned');
    });

    it('reports the first failure rather than the last', async function () {
      // Two refusals, so this says which one is kept. The first is the one that has
      // any chance of explaining the rest, and the later ones are often its echo.
      const { failure } = await serviceResolving().planCollected('tier_1', [
        { port: 'question', value: 'refuse:the first' },
        { port: 'shipping_name', value: 'refuse:the second' },
      ]);

      assert.match(String(failure), /refused refuse:the first/);
    });

    it('keeps the order values arrived in', async function () {
      const { plans, failure } = await serviceResolving().planCollected('tier_1', [
        { port: 'shipping_name', value: 'Bex Jones' },
        ADDRESS,
      ]);

      // Where two land in one field, the last applied is what the field holds.
      assert.equal(failure, undefined);
      assert.deepEqual(
        plans.map((plan) => plan.writes),
        [[{ value: 'Bex Jones' }], [{ value: '1 High Street' }]],
      );
    });

    it('skips a port that resolves to nothing', async function () {
      // A publisher who turned collection off leaves the processor still sending the
      // value, and nowhere for it to go is not a failure.
      const { plans, failure } = await serviceResolving(null).planCollected('tier_1', [ADDRESS]);

      assert.equal(failure, undefined);
      assert.deepEqual(plans, []);
    });
  });

  describe('planSuppliedByMember', function () {
    it('names the member whose record it is as the writer', async function () {
      const { plans } = await serviceResolving().planSuppliedByMember('member_1', 'tier_1', [
        ADDRESS,
      ]);

      assert.deepEqual(
        plans.map((plan) => plan.origin),
        [{ writtenBy: { type: 'member', id: 'member_1' }, source: 'checkout' }],
      );
    });
  });
});
