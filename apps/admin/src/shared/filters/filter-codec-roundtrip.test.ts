import nql from '@tryghost/nql-lang';
import { dateCodec, numberCodec, scalarCodec, setCodec, textCodec } from './filter-codecs';
import { describe, expect, it } from 'vitest';
import type { CodecContext, FilterCodec, FilterPredicate } from './filter-types';

// What a saved segment actually relies on: a predicate the publisher built in the UI
// is serialized to NQL, stored, and read back the next time the page loads. Every
// codec must survive that trip for every operator it advertises, whatever the value
// holds — the per-codec tests above assert one direction at a time against hand-written
// NQL, which is how the anchor readers in this engine and in member-filter-query.ts
// drifted apart without a test noticing.

function context(key: string, timezone = 'UTC'): CodecContext {
  return { key, pattern: key, params: {}, timezone };
}

function roundTrip(codec: FilterCodec, predicate: Omit<FilterPredicate, 'id'>, ctx: CodecContext) {
  const clauses = codec.serialize({ id: 'x', ...predicate }, ctx);

  if (!clauses) {
    throw new Error(`serialize returned null for ${predicate.operator}`);
  }

  const node = nql.parse(clauses.join('+'), { preserveRelativeDates: true });

  return codec.parse(node, ctx);
}

// Values chosen for what they do to the regex the text codec builds: `$` and `^` are
// the anchors the parse side reads operators from, so a value containing one is the
// case where escaping and anchoring have to be told apart.
const TEXT_VALUES = [
  'Ghost',
  'two words',
  '5$',
  '$5',
  '^caret',
  'a.b',
  "it's",
  'back\\slash',
  '-leading-hyphen',
  'trailing$',
];

const TEXT_OPERATORS = [
  'is',
  'contains',
  'does-not-contain',
  'starts-with',
  'does-not-start-with',
  'ends-with',
  'does-not-end-with',
];

describe('codec round trips', () => {
  describe('textCodec', () => {
    const ctx = context('email');
    const codec = textCodec();

    for (const operator of TEXT_OPERATORS) {
      it.each(TEXT_VALUES)(`round-trips ${operator} %j`, (value) => {
        expect(roundTrip(codec, { field: 'email', operator, values: [value] }, ctx)).toEqual({
          field: 'email',
          operator,
          values: [value],
        });
      });
    }
  });

  describe('scalarCodec', () => {
    const ctx = context('status');
    const codec = scalarCodec();

    for (const operator of ['is', 'is-not']) {
      it.each(['paid', 'two words', '-leading', "it's", 'a.b'])(
        `round-trips ${operator} %j`,
        (value) => {
          expect(roundTrip(codec, { field: 'status', operator, values: [value] }, ctx)).toEqual({
            field: 'status',
            operator,
            values: [value],
          });
        },
      );
    }
  });

  describe('setCodec', () => {
    const ctx = context('label');
    const codec = setCodec();

    for (const operator of ['is-any', 'is-not-any']) {
      it.each([[['vip']], [['vip', 'founder']], [['two words', 'a.b']]])(
        `round-trips ${operator} %j`,
        (values) => {
          const parsed = roundTrip(codec, { field: 'label', operator, values }, ctx);

          expect(parsed?.operator).toBe(operator);
          expect(parsed?.values).toEqual(
            [...values].sort((left, right) => left.localeCompare(right)),
          );
        },
      );
    }
  });

  describe('numberCodec', () => {
    const ctx = context('email_count');
    const codec = numberCodec();

    for (const operator of ['is', 'is-greater', 'is-or-greater', 'is-less', 'is-or-less']) {
      it.each([0, 1, 42])(`round-trips ${operator} %j`, (value) => {
        expect(roundTrip(codec, { field: 'email_count', operator, values: [value] }, ctx)).toEqual({
          field: 'email_count',
          operator,
          values: [value],
        });
      });
    }
  });

  describe('dateCodec', () => {
    const codec = dateCodec();

    for (const timezone of ['UTC', 'Europe/Berlin', 'America/Los_Angeles']) {
      for (const operator of ['is-less', 'is-or-less', 'is-greater', 'is-or-greater']) {
        it(`round-trips ${operator} in ${timezone}`, () => {
          const ctx = context('created_at', timezone);

          expect(
            roundTrip(codec, { field: 'created_at', operator, values: ['2026-08-11'] }, ctx),
          ).toEqual({
            field: 'created_at',
            operator,
            values: ['2026-08-11'],
          });
        });
      }

      for (const operator of ['in-the-last', 'in-the-next']) {
        it(`round-trips ${operator} in ${timezone}`, () => {
          const ctx = context('created_at', timezone);

          expect(roundTrip(codec, { field: 'created_at', operator, values: [30] }, ctx)).toEqual({
            field: 'created_at',
            operator,
            values: [30],
          });
        });
      }
    }
  });
});
