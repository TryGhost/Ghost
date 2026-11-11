import ObjectId from 'bson-objectid';
import sinon from 'sinon';
import { Frame, serializers as frameworkSerializers } from '@tryghost/api-framework';

const serializers = require('../../../../../../../core/server/api/endpoints/utils/serializers');
const labs = require('../../../../../../../core/shared/labs');

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
  { name: 'free signup', rules },
  {
    name: 'any paid tier',
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
    name: 'specific paid tier',
    rules: tierIds.map((productId) => ({
      trigger_type: 'paid_subscription_started',
      scope: 'specific_paid_tier',
      product_id: productId,
      direction: null,
    })),
  },
];

const commonTests = (method: 'add' | 'edit') => {
  describe('paid subscription changed trigger validation', () => {
    const tier = '64b6f7b7c8f1a2b3c4d5e6f7';
    const otherTier = '64b6f7b7c8f1a2b3c4d5e6f8';
    const destinationTier = '64b6f7b7c8f1a2b3c4d5e6f9';
    const rule = (scope: string, direction: string | null, product_id: string | null = null) => ({
      trigger_type: 'paid_subscription_changed',
      scope,
      direction,
      product_id,
    });
    const fromAny = rule('any_paid_tier', 'from');
    const toFree = rule('free', 'to');

    beforeEach(() => {
      sinon.stub(labs, 'isSet').withArgs('automationsLifecycleTriggers').returns(true);
    });

    afterEach(() => sinon.restore());

    it.each([
      [fromAny, toFree],
      [
        rule('specific_paid_tier', 'from', tier),
        rule('specific_paid_tier', 'from', otherTier),
        rule('specific_paid_tier', 'to', destinationTier),
      ],
      [
        fromAny,
        rule('specific_paid_tier', 'to', tier),
        rule('specific_paid_tier', 'to', otherTier),
      ],
    ])('accepts valid transitions: %j', async (...trigger_rules) => {
      const request = { ...payload, trigger_rules };
      await expect(serializeInput(method, request)).resolves.toEqual(request);
    });

    it.each([
      [],
      [fromAny],
      [toFree],
      [rule('free', 'from'), toFree],
      [rule('any_paid_tier', 'to'), fromAny],
      [rule('any_paid_tier', null), toFree],
      [fromAny, fromAny, toFree],
      [fromAny, rule('specific_paid_tier', 'from', tier), toFree],
      [fromAny, toFree, rule('specific_paid_tier', 'to', tier)],
      [fromAny, rule('specific_paid_tier', 'to', tier), rule('specific_paid_tier', 'to', tier)],
      [rule('specific_paid_tier', 'from'), toFree],
      [fromAny, rule('free', 'to', tier)],
      [fromAny, { trigger_type: 'free_signup', scope: null, direction: null, product_id: null }],
    ])('rejects invalid transitions: %j', async (...trigger_rules) => {
      await expect(serializeInput(method, { ...payload, trigger_rules })).rejects.toMatchObject({
        errorType: 'ValidationError',
        statusCode: 422,
      });
    });
  });

  describe('lifecycle trigger feature flag', () => {
    let isSet: sinon.SinonStub;
    const changedRules = [
      {
        trigger_type: 'paid_subscription_changed',
        scope: 'any_paid_tier',
        direction: 'from',
        product_id: null,
      },
      {
        trigger_type: 'paid_subscription_changed',
        scope: 'free',
        direction: 'to',
        product_id: null,
      },
    ];

    beforeEach(() => {
      isSet = sinon.stub(labs, 'isSet').withArgs('automationsLifecycleTriggers').returns(false);
    });

    afterEach(() => sinon.restore());

    it('rejects changed triggers when lifecycle triggers are disabled', async () => {
      await expect(
        serializeInput(method, { ...payload, trigger_rules: changedRules }),
      ).rejects.toMatchObject({
        errorType: 'ValidationError',
        statusCode: 422,
        property: 'trigger_rules',
        message:
          'Paid subscription changed triggers require automationsLifecycleTriggers to be enabled.',
      });
    });

    it('accepts changed triggers when lifecycle triggers are enabled', async () => {
      isSet.withArgs('automationsLifecycleTriggers').returns(true);
      const request = { ...payload, trigger_rules: changedRules };
      await expect(serializeInput(method, request)).resolves.toEqual(request);
    });

    it('accepts valid free signup rules when lifecycle triggers are disabled', async () => {
      await expect(serializeInput(method, payload)).resolves.toEqual(payload);
    });
  });

  describe('label added triggers', () => {
    const rule = {
      trigger_type: 'label_added',
      label_id: ObjectId().toHexString(),
      scope: null,
      product_id: null,
      direction: null,
    };
    let isSet: sinon.SinonStub;

    beforeEach(() => {
      isSet = sinon.stub(labs, 'isSet');
      isSet.withArgs('automationsLeadMagnets').returns(true);
      isSet.withArgs('automationsLifecycleTriggers').returns(true);
    });

    afterEach(() => {
      sinon.restore();
    });

    it('accepts one label rule when the lead magnets flag is enabled', async () => {
      const request = { ...payload, trigger_rules: [rule] };
      await expect(serializeInput(method, request)).resolves.toEqual(request);
    });

    it('requires the lead magnets flag', async () => {
      isSet.withArgs('automationsLeadMagnets').returns(false);
      await expect(
        serializeInput(method, { ...payload, trigger_rules: [rule] }),
      ).rejects.toMatchObject({
        errorType: 'ValidationError',
        statusCode: 422,
        property: 'trigger_rules',
        message: 'Label added triggers require automationsLeadMagnets to be enabled.',
      });
    });

    it.each([
      [{ ...rule, label_id: undefined }],
      [{ ...rule, label_id: null }],
      [{ ...rule, label_id: 'invalid' }],
      [{ ...rule, scope: 'any_paid_tier' }],
      [{ ...rule, product_id: tierIds[0] }],
      [{ ...rule, direction: 'from' }],
      [rule, { ...rule, label_id: ObjectId().toHexString() }],
      [rule, rule],
      [rule, ...rules],
      [...rules, rule],
    ])('rejects invalid label rules: %j', async (...trigger_rules) => {
      await expect(serializeInput(method, { ...payload, trigger_rules })).rejects.toMatchObject({
        errorType: 'ValidationError',
        statusCode: 422,
      });
    });
  });

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
  ])('rejects invalid rules: %j', async (trigger_rules) => {
    await expect(serializeInput(method, { ...payload, trigger_rules })).rejects.toMatchObject({
      errorType: 'ValidationError',
    });
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

  it.each(triggerCases)('accepts $name rules', async ({ rules: trigger_rules }) => {
    const request = { ...payload, trigger_rules };
    await expect(serializeInput(method, request)).resolves.toEqual(request);
  });

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
      { trigger_tier_scope: 'free' },
      { trigger_tier_ids: null },
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
