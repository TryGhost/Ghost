import assert from 'node:assert/strict';
import {
  LEAVES,
  SHAPES,
  keysOf,
  matchShape,
  shaped,
  type AnyLeafValue,
  type FieldShape,
  type LeafKind,
  type ShapeValue,
  type ShapeWrite,
  type ShapedField,
  type TypedSettings,
  type ValueKind,
  type ValueOfKind,
} from '@tryghost/metafield-types';
import { ALL_FIELD_FIXTURES, type AnyFieldFixture } from '@tryghost/metafield-types/test/fixtures';

const { agentProvider, fixtureManager, mockManager } = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

/** How NQL writes a value of each kind, as a filter compares it. */
const NQL_LITERALS: {
  readonly [K in ValueKind]: {
    is(value: unknown): value is ValueOfKind<K>;
    literal(value: ValueOfKind<K>): string;
  };
} = {
  string: {
    is: (value): value is string => typeof value === 'string',
    literal: (value) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`,
  },
  // Unquoted, which NQL reads as a number.
  number: {
    is: (value): value is number => typeof value === 'number',
    literal: (value) => String(value),
  },
};

function literalAs<K extends ValueKind>(kind: K, value: AnyLeafValue): string | undefined {
  const entry = NQL_LITERALS[kind];
  return entry.is(value) ? entry.literal(value) : undefined;
}

const literal = (value: AnyLeafValue): string =>
  keysOf(NQL_LITERALS)
    .map((kind) => literalAs(kind, value))
    .find((written) => written !== undefined) ?? assert.fail(`no literal for ${value}`);

/** A scalar fixture's values, sorted as its leaf orders them, or null for a kind no filter orders. */
function inOrder({ field, values }: AnyFieldFixture): AnyLeafValue[] | null {
  return matchShape<AnyLeafValue[] | null>(field.type, {
    scalar: ({ leaf }) => sortedAs(leaf, values),
    record: () => null,
    set: () => null,
  });
}

function sortedAs<K extends LeafKind>(leaf: { readonly leaf: K }, values: readonly unknown[]) {
  const { order, read } = LEAVES[leaf.leaf];
  const held = values.flatMap((value) => {
    const leafValue = read(value);
    return leafValue === undefined ? [] : [leafValue];
  });
  return order ? [...held].sort(order) : null;
}

/**
 * Whether NQL can write a value. It can't write a negative number: `-` is its negation, so
 * `value:-7` reads as something else. Left out of the filters below and pinned on its own, so the
 * gap stays in view.
 */
const nqlCanWrite = (value: unknown) => !(typeof value === 'number' && value < 0);

const matching = (identity: string, value: string) =>
  `(metafields.identity:'${identity}'+metafields.value:${value})`;

/** A filter naming a held value, with which other held values of the field it also finds. */
interface ValueFilter<S extends FieldShape> {
  readonly filter: string;
  finds(held: ShapeValue[S]): boolean;
}

/**
 * The filters that name a member's value in the field keyed `key`, by shape: a scalar's value, each
 * part of a record, and any of a set's options. Keyed by shape, so a type added to the catalog is
 * covered by its fixtures.
 */
const FILTERS: {
  readonly [S in FieldShape]: (key: string, value: ShapeValue[S]) => ValueFilter<S>[];
} = {
  scalar: (key, value) => [
    { filter: matching(`custom.${key}`, literal(value)), finds: (held) => held === value },
  ],
  record: (key, value) =>
    keysOf(value).flatMap((part) => {
      const partValue = value[part];
      return partValue === undefined
        ? []
        : [
            {
              filter: matching(`custom.${key}.${part}`, literal(partValue)),
              finds: (held) => held[part] === partValue,
            },
          ];
    }),
  set: (key, value) => [
    {
      filter: matching(`custom.${key}`, `[${value.map(literal).join(',')}]`),
      finds: (held) => held.some((option) => value.includes(option)),
    },
  ],
};

interface Transition<S extends FieldShape> {
  was: ShapeValue[S] | undefined;
  next: ShapeValue[S];
  /** Undefined when the two hold the same, so there is nothing to write. */
  write: ShapeWrite[S] | null | undefined;
}

/** Each value a fixture's field could hold, or none, turned into each other by the write its shape gives. */
function transitions<S extends FieldShape>(
  { shape, field }: ShapedField<TypedSettings, S>,
  raws: readonly unknown[],
): Transition<S>[] {
  const rules = SHAPES[shape];
  const values = raws.map(
    (raw) =>
      rules.parse(field.type, raw) ??
      assert.fail(`a ${field.type} fixture value isn't its shape's structure`),
  );
  return [undefined, ...values].flatMap((was) =>
    values.map((next) => ({ was, next, write: rules.diff(was, next) })),
  );
}

// Every field type the catalog has, over the fixtures it declares: each surface the API reaches
// (writing, storing, reading back, clearing and filtering) is checked for every type at once, so a
// type added to the catalog is checked here by giving it fixtures.
describe('Every custom field type through the Admin API', function () {
  let agent: {
    get: (_url: string) => any;
    put: (_url: string) => any;
    post: (_url: string) => any;
    loginAsOwner: () => Promise<void>;
  };
  let memberCounter = 0;

  async function createField({ field }: AnyFieldFixture): Promise<string> {
    const { body } = await agent
      .post('members/metafields/custom/')
      .body({
        members_metafields: [{ name: `A ${field.type} fixture`, ...field }],
      })
      .expectStatus(201);
    return body.members_metafields[0].key;
  }

  async function createMember(
    custom: Record<string, unknown>,
  ): Promise<{ id: string; email: string }> {
    memberCounter += 1;
    const email = `cf-type-${memberCounter}@example.com`;
    const { body } = await agent
      .post('members/')
      .body({ members: [{ email, metafields: { custom } }] })
      .expectStatus(201);
    return { id: body.members[0].id, email };
  }

  async function held(memberId: string, key: string): Promise<unknown> {
    const { body } = await agent.get(`members/${memberId}/?include=metafields`).expectStatus(200);
    return body.members[0].metafields?.custom?.[key];
  }

  async function browse(filter: string): Promise<string[]> {
    const { body } = await agent
      .get(`members/?filter=${encodeURIComponent(filter)}`)
      .expectStatus(200);
    return body.members.map((m: { email: string }) => m.email);
  }

  /**
   * Creates a member holding each of the fixture's values, then checks that each value's filters
   * find exactly the holders whose value they name: the holders of other values are excluded, and
   * ones sharing the named part or option are included. Returns how many members hold a value.
   */
  async function filtersFindExactly<S extends FieldShape>(
    of: ShapedField<TypedSettings, S>,
    key: string,
    raws: readonly unknown[],
  ): Promise<number> {
    const values = raws.map(
      (raw) =>
        SHAPES[of.shape].parse(of.field.type, raw) ??
        assert.fail(`a ${of.field.type} fixture value isn't its shape's structure`),
    );
    const holders: Array<{ email: string; value: ShapeValue[S] }> = [];
    for (const value of values) {
      holders.push({ email: (await createMember({ [key]: value })).email, value });
    }
    for (const { value } of holders.filter((holder) => nqlCanWrite(holder.value))) {
      for (const { filter, finds } of FILTERS[of.shape](key, value)) {
        const expected = holders.filter((holder) => finds(holder.value)).map((h) => h.email);
        assert.deepEqual((await browse(filter)).sort(), expected.sort(), filter);
      }
    }
    return holders.length;
  }

  beforeAll(async function () {
    agent = await agentProvider.getAdminAPIAgent();
    await fixtureManager.init('users');
    await agent.loginAsOwner();
  });

  beforeEach(function () {
    mockManager.mockLabsEnabled('membersCustomFields');
  });

  afterEach(async function () {
    mockManager.restore();
    await models.Base.knex('members_metafield_values').del();
    await models.Base.knex('members_metafields').del();
    await models.Base.knex('members').del();
    await models.Base.knex('actions')
      .whereIn('resource_type', ['member', 'member_custom_field'])
      .del();
  });

  describe.each(
    ALL_FIELD_FIXTURES.map((fixture): [string, AnyFieldFixture] => [fixture.field.type, fixture]),
  )('a %s field', (_type, fixture) => {
    it('reads back each value as it was written, and clears with null', async function () {
      const key = await createField(fixture);
      for (const value of fixture.values) {
        const member = await createMember({ [key]: value });
        assert.deepEqual(await held(member.id, key), value, JSON.stringify(value));

        await agent
          .put(`members/${member.id}/`)
          .body({ members: [{ metafields: { custom: { [key]: null } } }] })
          .expectStatus(200);
        assert.equal(await held(member.id, key), undefined);
      }
    });

    // The write a form sends is worked out against what it loaded and applied by Ghost to what
    // is stored, so the two have to agree about what the write does, for every pair of values.
    it('turns any held value into any other with the write its shape gives', async function () {
      const key = await createField(fixture);
      for (const { was, next, write } of transitions(shaped(fixture.field), fixture.values)) {
        const member = await createMember(was === undefined ? {} : { [key]: was });
        if (write !== undefined) {
          await agent
            .put(`members/${member.id}/`)
            .body({ members: [{ metafields: { custom: { [key]: write } } }] })
            .expectStatus(200);
        }
        assert.deepEqual(await held(member.id, key), next, JSON.stringify({ was, next, write }));
      }
    });

    it('finds exactly the members each value filter names, and anyone holding a value', async function () {
      const key = await createField(fixture);
      const without = await createMember({});
      const holders = await filtersFindExactly(shaped(fixture.field), key, fixture.values);
      const holding = await browse(`metafields.identity:'custom.${key}'`);
      assert.equal(holding.length, holders);
      assert.ok(!holding.includes(without.email));
    });

    // A kind of leaf whose values order, as the domain says, is compared by more or less in
    // that order.
    it('compares by more or less as its leaf orders its values', async function () {
      const sorted = inOrder(fixture);
      if (!sorted) {
        return;
      }
      const key = await createField(fixture);
      const holders = new Map<AnyLeafValue, string>();
      for (const value of sorted) {
        holders.set(value, (await createMember({ [key]: value })).email);
      }
      const emails = (values: AnyLeafValue[]) => values.map((value) => holders.get(value)).sort();
      for (const [index, value] of sorted.entries()) {
        if (!nqlCanWrite(value)) {
          continue;
        }
        const above = await browse(matching(`custom.${key}`, `>${literal(value)}`));
        assert.deepEqual(above.sort(), emails(sorted.slice(index + 1)), `>${value}`);
        const below = await browse(matching(`custom.${key}`, `<${literal(value)}`));
        assert.deepEqual(below.sort(), emails(sorted.slice(0, index)), `<${value}`);
      }
    });
  });

  it.fails('finds a member by a negative number they hold, once NQL can write one', async function () {
    const { body } = await agent
      .post('members/metafields/custom/')
      .body({ members_metafields: [{ name: 'Balance', type: 'number' }] })
      .expectStatus(201);
    const key = body.members_metafields[0].key;
    const member = await createMember({ [key]: -7 });
    // Someone holding another number, whom "not 7", which is what `-7` reads as, would also find.
    await createMember({ [key]: 3 });
    assert.deepEqual(await browse(matching(`custom.${key}`, '-7')), [member.email]);
  });
});
