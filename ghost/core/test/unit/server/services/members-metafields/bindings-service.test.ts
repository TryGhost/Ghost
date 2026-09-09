import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { MetafieldBindingsService } from '../../../../../core/server/services/members-metafields/bindings-service';

// What a port resolves to. Every port here resolves to the same field, because where a
// value lands is not what any of these are about.
const BOUND_ROW = { binding_id: 'binding_1', key: 'delivery_address', type: 'short_text' };

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

interface Applied {
  writtenBy: unknown;
}

/** Values the stubbed catalog refuses, named so a test can tell two refusals apart. */
const REFUSED = /^refuse:/;

/** Refuses anything named as refusable, and records everything it stores. */
const recordingValues = (applied: Applied[]) =>
  ({
    planWrite: async (input: Record<string, unknown>) => {
      const refused = Object.values(input).find(
        (value) => typeof value === 'string' && REFUSED.test(value),
      );
      if (refused !== undefined) {
        throw new Error(`the catalog refused ${refused}`);
      }
      return [];
    },
    applyWrite: async (_memberId: string, _planned: unknown[], options: Applied) => {
      applied.push({ writtenBy: options.writtenBy });
    },
  }) as never;

const serviceWriting = (applied: Applied[], row: unknown = BOUND_ROW) =>
  new MetafieldBindingsService({ knex: knexReturning(row), values: recordingValues(applied) });

const ADDRESS = { port: 'shipping_address', value: '1 High Street' };

describe('MetafieldBindingsService', function () {
  // Which of these a caller reaches for is how it states where a value came from, so
  // there is no writer to pass, and none to get wrong.
  describe('writeCollected', function () {
    it('records the binding that routed the value', async function () {
      const applied: Applied[] = [];

      await serviceWriting(applied).writeCollected('member_1', 'tier_1', [ADDRESS]);

      // The id resolves back to the tier that asked and the field it landed in, which
      // is why only the service can supply it.
      assert.deepEqual(applied, [{ writtenBy: { type: 'binding', id: 'binding_1' } }]);
    });

    it('attempts every value before raising a failure', async function () {
      const applied: Applied[] = [];

      await assert.rejects(
        serviceWriting(applied).writeCollected('member_1', 'tier_1', [
          { port: 'question', value: 'refuse:the answer' },
          ADDRESS,
        ]),
        /refused refuse:the answer/,
      );

      // The point of raising afterwards rather than at once: the values have nothing to
      // do with each other, so the good one is still stored.
      assert.equal(applied.length, 1, 'the value that could be stored was stored');
    });

    it('attempts later values when working out where one of them goes fails', async function () {
      const applied: Applied[] = [];
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
      const service = new MetafieldBindingsService({
        knex: (() => chain) as never,
        values: recordingValues(applied),
      });

      // Finding where a value goes is a database query, and it can fail the way storing
      // one can. Neither is a reason to give up on the values either side of it.
      await assert.rejects(
        service.writeCollected('member_1', 'tier_1', [{ port: 'question', value: 'x' }, ADDRESS]),
        /the lookup failed/,
      );

      assert.equal(applied.length, 1, 'the value whose port did resolve was still stored');
    });

    it('raises the first failure rather than the last', async function () {
      const applied: Applied[] = [];

      // Two refusals, so this says which one is kept. The first is the one that has
      // any chance of explaining the rest, and the later ones are often its echo.
      await assert.rejects(
        serviceWriting(applied).writeCollected('member_1', 'tier_1', [
          { port: 'question', value: 'refuse:the first' },
          { port: 'shipping_name', value: 'refuse:the second' },
        ]),
        /refused refuse:the first/,
      );
    });

    it('says nothing when every value is stored', async function () {
      const applied: Applied[] = [];

      await serviceWriting(applied).writeCollected('member_1', 'tier_1', [
        { port: 'shipping_name', value: 'Bex Jones' },
        ADDRESS,
      ]);

      assert.equal(applied.length, 2);
    });

    it('skips a port that resolves to nothing', async function () {
      const applied: Applied[] = [];

      // A publisher who turned collection off leaves the processor still sending the
      // value, and nowhere for it to go is not a failure. The same recording stub as
      // every other test here, so an unwanted write would show up rather than being
      // impossible to see.
      await serviceWriting(applied, null).writeCollected('member_1', 'tier_1', [ADDRESS]);

      assert.deepEqual(applied, [], 'nothing was written');
    });
  });

  describe('writeSuppliedByMember', function () {
    it('records the member whose record it is', async function () {
      const applied: Applied[] = [];

      await serviceWriting(applied).writeSuppliedByMember('member_1', 'tier_1', [ADDRESS]);

      assert.deepEqual(applied, [{ writtenBy: { type: 'member', id: 'member_1' } }]);
    });
  });
});
