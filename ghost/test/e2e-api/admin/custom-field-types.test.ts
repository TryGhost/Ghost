import assert from 'node:assert/strict';
import {
  SHAPES,
  keysOf,
  shaped,
  type AnyLeafValue,
  type FieldShape,
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
};

function literalAs<K extends ValueKind>(kind: K, value: AnyLeafValue): string | undefined {
  const entry = NQL_LITERALS[kind];
  return entry.is(value) ? entry.literal(value) : undefined;
}

const literal = (value: AnyLeafValue): string =>
  keysOf(NQL_LITERALS)
    .map((kind) => literalAs(kind, value))
    .find((written) => written !== undefined) ?? assert.fail(`no literal for ${value}`);

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
    for (const { value } of holders) {
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
  });
});
