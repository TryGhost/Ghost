import assert from 'node:assert/strict';
import { z } from 'zod';
import { lenient, parseLeniently } from '../../../../core/shared/config/lenient';

const schema = z.looseObject({
  name: z.string().meta({ fatal: true }),
  section: z
    .object({
      count: z.number(),
      label: z.string().optional(),
    })
    .transform((section) => ({ ...section, seen: true })),
  strict: z.strictObject({ on: z.boolean() }).optional(),
  pick: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('a'), a: z.number() }),
    z.object({ kind: z.literal('b'), b: z.string() }),
  ]),
});

const lax = lenient(schema);
const valid = { name: 'n', section: { count: 1 }, pick: { kind: 'a', a: 1 } };

describe('lenient', function () {
  it('parses valid input exactly as the strict schema does', function () {
    assert.deepEqual(parseLeniently(lax, valid), { data: schema.parse(valid), issues: [] });
  });

  it('keeps a bad leaf raw, names it, and still runs its parent transform', function () {
    const { data, issues } = parseLeniently(lax, { ...valid, section: { count: 'x' }, extra: 1 });

    assert.deepEqual(data.section, { count: 'x', seen: true });
    assert.equal(data.extra, 1);
    assert.deepEqual(
      issues.map((issue) => issue.path),
      [['section', 'count']],
    );
  });

  it('wraps the leaves of the union option the discriminator picks', function () {
    const { data, issues } = parseLeniently(lax, { ...valid, pick: { kind: 'b', b: 2 } });

    assert.deepEqual(data.pick, { kind: 'b', b: 2 });
    assert.deepEqual(
      issues.map((issue) => issue.path),
      [['pick', 'b']],
    );
  });

  it('falls back on the whole union for an unknown discriminator', function () {
    const { data, issues } = parseLeniently(lax, { ...valid, pick: { kind: 'z' } });

    assert.deepEqual(data.pick, { kind: 'z' });
    assert.deepEqual(
      issues.map((issue) => issue.path),
      [['pick', 'kind']],
    );
  });

  it('falls back on a section that fails as a whole', function () {
    const { data, issues } = parseLeniently(lax, { ...valid, strict: { on: true, typo: 1 } });

    assert.deepEqual(data.strict, { on: true, typo: 1 });
    assert.deepEqual(data.section, { count: 1, seen: true });
    assert.deepEqual(
      issues.map((issue) => issue.path),
      [['strict']],
    );
  });

  it('still throws for a fatal key', function () {
    assert.throws(() => parseLeniently(lax, { ...valid, name: 1 }), z.ZodError);
  });

  it('still throws for a fatal key inside a section', function () {
    const nested = lenient(
      z.object({ outer: z.object({ inner: z.string().meta({ fatal: true }) }) }),
    );

    assert.throws(() => parseLeniently(nested, { outer: { inner: 1 } }), z.ZodError);
  });

  it('reports every failure at once, each by its full path', function () {
    const { issues } = parseLeniently(lax, {
      ...valid,
      section: { count: 'x', label: 2 },
      strict: { on: 'yes' },
      pick: { kind: 'a', a: 'one' },
    });

    assert.deepEqual(
      issues.map((issue) => issue.path),
      [
        ['section', 'count'],
        ['section', 'label'],
        ['strict', 'on'],
        ['pick', 'a'],
      ],
    );
  });

  describe('a section with a transform', function () {
    it('falls back without running the transform when the section is missing', function () {
      const { data, issues } = parseLeniently(lax, { ...valid, section: undefined });

      assert.equal(data.section, undefined);
      assert.deepEqual(
        issues.map((issue) => issue.path),
        [['section']],
      );
    });

    it('falls back without running the transform when the section is null', function () {
      const transformed = lenient(
        z.object({ conn: z.looseObject({ host: z.string() }).transform(({ host }) => ({ host })) }),
      );

      const { data, issues } = parseLeniently(transformed, { conn: null });

      assert.equal(data.conn, null);
      assert.deepEqual(
        issues.map((issue) => issue.path),
        [['conn']],
      );
    });
  });

  describe('wrappers', function () {
    const wrapped = lenient(
      z.object({
        nullable: z.number().nullable(),
        withDefault: z.number().default(5),
        prefault: z.object({ n: z.number() }).prefault({ n: 1 }),
        frozen: z.object({ n: z.number() }).readonly(),
      }),
    );
    const validInput = { nullable: null, frozen: { n: 1 } };

    it('applies defaults and accepts what the wrapper allows', function () {
      assert.deepEqual(parseLeniently(wrapped, validInput), {
        data: { nullable: null, withDefault: 5, prefault: { n: 1 }, frozen: { n: 1 } },
        issues: [],
      });
    });

    it('falls back on a bad value inside each wrapper', function () {
      const { data, issues } = parseLeniently(wrapped, {
        nullable: 'x',
        withDefault: 'x',
        prefault: { n: 'x' },
        frozen: { n: 'x' },
      });

      assert.deepEqual(data, {
        nullable: 'x',
        withDefault: 'x',
        prefault: { n: 'x' },
        frozen: { n: 'x' },
      });
      assert.deepEqual(
        issues.map((issue) => issue.path),
        [['nullable'], ['withDefault'], ['prefault', 'n'], ['frozen', 'n']],
      );
    });
  });

  describe('a fatal key nested where a catch would hide it', function () {
    const fatal = z.string().meta({ fatal: true });

    it('throws inside a plain union', function () {
      const union = lenient(z.object({ u: z.union([z.object({ a: fatal }), z.number()]) }));

      assert.throws(() => parseLeniently(union, { u: { a: 1 } }), z.ZodError);
    });

    it('throws inside an array', function () {
      const array = lenient(z.object({ list: z.array(fatal) }));

      assert.throws(() => parseLeniently(array, { list: [1] }), z.ZodError);
    });

    it('throws inside a transform of a single value', function () {
      const piped = lenient(z.object({ p: fatal.transform((value) => value.trim()) }));

      assert.throws(() => parseLeniently(piped, { p: 1 }), z.ZodError);
    });

    it('throws when the section holding it is missing', function () {
      const nested = lenient(z.object({ outer: z.object({ inner: fatal }) }));

      assert.throws(() => parseLeniently(nested, {}), z.ZodError);
    });
  });

  it('leaves the strict schema untouched', function () {
    assert.equal(schema.safeParse({ ...valid, section: { count: 'x' } }).success, false);
  });
});
