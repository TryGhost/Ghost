import ObjectId from 'bson-objectid';
import { Frame, serializers as frameworkSerializers } from '@tryghost/api-framework';

const serializers = require('../../../../../../../core/server/api/endpoints/utils/serializers');

const rules = [{ trigger_type: 'free_signup', scope: null, product_id: null, direction: null }];
const data = { name: 'Draft', description: '', status: 'inactive', actions: [], edges: [] };

async function serializeInput(method: 'add' | 'edit', input: unknown) {
  const frame = new Frame({ body: { automations: [input] } });
  frame.configure({});
  await frameworkSerializers.handle.input(
    { docName: 'automations', method },
    serializers.input,
    frame,
  );
  return frame.data;
}

const action = { id: ObjectId().toHexString(), type: 'wait', data: { wait_hours: 1 } };
const payload = { ...data, actions: [action], trigger_rules: rules };
const tierIds = [ObjectId().toHexString(), ObjectId().toHexString()];
const triggerCases = [
  { legacy: { trigger_tier_scope: 'free', trigger_tier_ids: null }, rules },
  {
    legacy: { trigger_tier_scope: 'all_paid', trigger_tier_ids: null },
    rules: [
      {
        trigger_type: 'paid_subscription_started',
        scope: 'any_paid_tier',
        product_id: null,
        direction: null,
      },
    ],
  },
  {
    legacy: { trigger_tier_scope: 'selected_paid', trigger_tier_ids: tierIds },
    rules: tierIds.map((productId) => ({
      trigger_type: 'paid_subscription_started',
      scope: 'specific_paid_tier',
      product_id: productId,
      direction: null,
    })),
  },
];

const commonTests = (method: 'add' | 'edit') => {
  it.each([
    undefined,
    null,
    'invalid',
    42,
    false,
    {},
    { 0: { ...data, trigger_rules: rules } },
    { 0: { ...data, trigger_rules: rules }, length: 1 },
  ])('rejects non-array automation envelopes: %j', async (automations) => {
    const frame = new Frame({ body: { automations } });
    frame.configure({});
    await expect(
      frameworkSerializers.handle.input(
        { docName: 'automations', method },
        serializers.input,
        frame,
      ),
    ).rejects.toMatchObject({ errorType: 'ValidationError' });
  });

  it.each([
    null,
    [],
    [{}],
    [
      {
        trigger_type: 'free_signup',
        scope: 'any_paid_tier',
        product_id: null,
        direction: null,
      },
    ],
    [
      {
        trigger_type: 'paid_subscription_started',
        scope: 'specific_paid_tier',
        product_id: 'invalid',
        direction: null,
      },
    ],
    [...rules, ...rules],
  ])('rejects invalid explicit rules without falling back: %j', async (trigger_rules) => {
    await expect(
      serializeInput(method, { ...payload, trigger_rules, ...triggerCases[0].legacy }),
    ).rejects.toMatchObject({ errorType: 'ValidationError' });
  });

  const freeRule = {
    trigger_type: 'free_signup',
    scope: null,
    product_id: null,
    direction: null,
  };
  const anyPaidRule = {
    trigger_type: 'paid_subscription_started',
    scope: 'any_paid_tier',
    product_id: null,
    direction: null,
  };
  const specificPaidRule = {
    trigger_type: 'paid_subscription_started',
    scope: 'specific_paid_tier',
    product_id: tierIds[0],
    direction: null,
  };
  it.each([
    { name: 'mixed trigger types, free first', rules: [freeRule, anyPaidRule] },
    { name: 'mixed trigger types, paid first', rules: [specificPaidRule, freeRule] },
    { name: 'multiple free signup rules', rules: [freeRule, freeRule] },
    { name: 'multiple any-paid-tier rules', rules: [anyPaidRule, anyPaidRule] },
    { name: 'mixed paid scopes, any first', rules: [anyPaidRule, specificPaidRule] },
    { name: 'mixed paid scopes, specific first', rules: [specificPaidRule, anyPaidRule] },
    {
      name: 'duplicate products despite different key order',
      rules: [
        specificPaidRule,
        {
          direction: null,
          product_id: tierIds[0],
          scope: 'specific_paid_tier',
          trigger_type: 'paid_subscription_started',
        },
      ],
    },
  ])('rejects $name', async ({ rules: trigger_rules }) => {
    await expect(serializeInput(method, { ...payload, trigger_rules })).rejects.toMatchObject({
      errorType: 'ValidationError',
    });
  });

  for (const { legacy, rules: triggerRules } of triggerCases) {
    it(`normalizes legacy ${legacy.trigger_tier_scope} fields on the frame`, async () => {
      await expect(serializeInput(method, { ...data, ...legacy })).resolves.toEqual({
        ...data,
        trigger_rules: triggerRules,
      });
    });

    it(`accepts ${legacy.trigger_tier_scope} rules with precedence over invalid legacy fields`, async () => {
      const request = { ...payload, trigger_rules: triggerRules };
      await expect(serializeInput(method, request)).resolves.toEqual(request);
      await expect(
        serializeInput(method, {
          ...request,
          trigger_tier_scope: 'invalid',
          trigger_tier_ids: false,
        }),
      ).resolves.toEqual(request);
    });
  }

  it('accepts 100 distinct specific paid tiers and rejects 101', async () => {
    const trigger_rules = Array.from({ length: 100 }, () => ({
      trigger_type: 'paid_subscription_started',
      scope: 'specific_paid_tier',
      product_id: ObjectId().toHexString(),
      direction: null,
    }));
    const request = { ...payload, trigger_rules };
    await expect(serializeInput(method, request)).resolves.toEqual(request);
    await expect(
      serializeInput(method, {
        ...payload,
        trigger_rules: [
          ...trigger_rules,
          { ...specificPaidRule, product_id: ObjectId().toHexString() },
        ],
      }),
    ).rejects.toMatchObject({ errorType: 'ValidationError' });
  });

  for (const [field, values] of [
    ['name', ['', ' \t\n ', 'x'.repeat(192), null, 123]],
    ['description', ['x'.repeat(2001), null, 123]],
  ] as const) {
    it.each(values)(`rejects invalid ${field}: %j`, async (value) => {
      await expect(serializeInput(method, { ...payload, [field]: value })).rejects.toMatchObject({
        errorType: 'ValidationError',
      });
    });
  }

  it.each([undefined, '24', -24, 0, 24.5, 721])(
    'rejects invalid wait hours: %j',
    async (wait_hours) => {
      await expect(
        serializeInput(method, { ...payload, actions: [{ ...action, data: { wait_hours } }] }),
      ).rejects.toMatchObject({ errorType: 'ValidationError' });
    },
  );

  it('trims metadata before validating lengths', async () => {
    await expect(
      serializeInput(method, {
        ...payload,
        name: '  Renamed flow\n',
        description: '\tUpdated description  ',
      }),
    ).resolves.toMatchObject({ name: 'Renamed flow', description: 'Updated description' });
    await expect(
      serializeInput(method, { ...payload, description: ' \t\n ' }),
    ).resolves.toMatchObject({ description: '' });
    await expect(
      serializeInput(method, {
        ...payload,
        name: ` ${'x'.repeat(191)} `,
        description: ` ${'x'.repeat(2000)} `,
      }),
    ).resolves.toMatchObject({ name: 'x'.repeat(191), description: 'x'.repeat(2000) });
  });

  it.each([
    { trigger_tier_scope: 'paid' },
    { trigger_tier_scope: null },
    { trigger_tier_ids: [tierIds[0]] },
    { trigger_tier_scope: null, trigger_tier_ids: [tierIds[0]] },
    { trigger_tier_scope: 'free', trigger_tier_ids: [tierIds[0]] },
    { trigger_tier_scope: 'all_paid', trigger_tier_ids: [tierIds[0]] },
    { trigger_tier_scope: 'selected_paid' },
    { trigger_tier_scope: 'selected_paid', trigger_tier_ids: [] },
    { trigger_tier_scope: 'selected_paid', trigger_tier_ids: [123] },
    { trigger_tier_scope: 'selected_paid', trigger_tier_ids: ['invalid'] },
  ])('rejects invalid legacy trigger input: %j', async (legacy) => {
    await expect(serializeInput(method, { ...data, ...legacy })).rejects.toMatchObject({
      errorType: 'ValidationError',
    });
  });

  it('reports duplicate legacy tier IDs with their field-level error', async () => {
    await expect(
      serializeInput(method, {
        ...data,
        trigger_tier_scope: 'selected_paid',
        trigger_tier_ids: [...tierIds, tierIds[0]],
      }),
    ).rejects.toMatchObject({
      errorType: 'ValidationError',
      statusCode: 422,
      message: expect.stringMatching(
        /trigger_tier_ids: Duplicate trigger_tier_ids are not allowed\./,
      ),
    });
  });
};

describe('automation input serializers', () => {
  describe('add', () => {
    commonTests('add');

    it.each([undefined, null, [], {}])('rejects invalid add payload: %j', async (input) => {
      await expect(serializeInput('add', input)).rejects.toMatchObject({
        errorType: 'ValidationError',
      });
    });

    it.each(['name', 'description', 'status', 'actions', 'edges', 'trigger_rules'])(
      'requires %s when adding',
      async (field) => {
        await expect(
          serializeInput('add', { ...payload, [field]: undefined }),
        ).rejects.toMatchObject({ errorType: 'ValidationError' });
      },
    );

    it.each([
      { slug: 'member-welcome-email-free' },
      { id: ObjectId().toHexString() },
      { status: 'invalid' },
    ])('rejects invalid add fields: %j', async (extra) => {
      await expect(serializeInput('add', { ...payload, ...extra })).rejects.toMatchObject({
        errorType: 'ValidationError',
      });
    });
  });

  describe('edit', () => {
    commonTests('edit');

    it.each([
      { graph: { actions: [action] }, missingField: 'edges' },
      { graph: { edges: [] }, missingField: 'actions' },
    ])('reports missing $missingField when editing a graph', async ({ graph, missingField }) => {
      await expect(serializeInput('edit', { status: 'inactive', ...graph })).rejects.toMatchObject({
        errorType: 'ValidationError',
        statusCode: 422,
        message: expect.stringContaining(`${missingField}:`),
      });
    });

    it.each([
      { name: 'Renamed' },
      { description: 'Updated' },
      { trigger_rules: rules },
      { trigger_tier_scope: 'free' },
      { trigger_tier_ids: null },
    ])('rejects extra fields on status-only edits: %j', async (extra) => {
      await expect(serializeInput('edit', { status: 'inactive', ...extra })).rejects.toMatchObject({
        errorType: 'ValidationError',
      });
    });

    it('rejects status-only activation and metadata-only edits', async () => {
      await expect(serializeInput('edit', { status: 'active' })).rejects.toMatchObject({
        errorType: 'ValidationError',
        property: 'status',
        message: 'Status-only automation edits can only set status to inactive or archived.',
      });
      await expect(
        serializeInput('edit', { name: 'Renamed', description: 'Updated' }),
      ).rejects.toMatchObject({ errorType: 'ValidationError' });
    });

    it('preserves omitted metadata and trigger rules on edits', async () => {
      const graph = { status: 'inactive', actions: [action], edges: [] };
      await expect(serializeInput('edit', graph)).resolves.toEqual(graph);
      await expect(serializeInput('edit', { status: 'inactive' })).resolves.toEqual({
        status: 'inactive',
      });
    });
  });
});
