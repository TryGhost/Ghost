import assert from 'node:assert/strict';
import {
  automationTriggerRuleDefinitionSchema,
  buildTriggerRuleRows,
} from '../../../../../core/server/services/automations/trigger-rules';

const automationId = '64b6f7b7c8f1a2b3c4d5e6f7';
const createdAt = new Date('2026-01-02T03:04:05.678Z');
const tierIds = ['64b6f7b7c8f1a2b3c4d5e6f8', '64b6f7b7c8f1a2b3c4d5e6f9'];

const assertGeneratedId = (id: string) => assert.match(id, /^[a-f0-9]{24}$/);

describe('buildTriggerRuleRows', function () {
  it.each([
    { scope: 'free', triggerType: 'free_signup', ruleScope: null },
    { scope: 'all_paid', triggerType: 'paid_subscription_started', ruleScope: 'any_paid_tier' },
  ] as const)('builds one rule for $scope', function ({ scope, triggerType, ruleScope }) {
    const rules = buildTriggerRuleRows({ automationId, scope, tierIds: [], createdAt });

    assert.equal(rules.length, 1);
    assertGeneratedId(rules[0].id);
    assert.deepEqual(rules[0], {
      id: rules[0].id,
      automation_id: automationId,
      created_at: createdAt,
      trigger_type: triggerType,
      scope: ruleScope,
      product_id: null,
      direction: null,
    });
    assert(rules[0].created_at instanceof Date);
    assert.equal(rules[0].created_at.toISOString(), '2026-01-02T03:04:05.678Z');
  });

  it('builds one rule per distinct selected tier without changing the input', function () {
    const selectedTierIds = Object.freeze([tierIds[1], tierIds[0], tierIds[1]]);
    const options = Object.freeze({
      automationId,
      scope: 'selected_paid' as const,
      tierIds: selectedTierIds,
      createdAt,
    });

    const rules = buildTriggerRuleRows(options);

    assert.deepEqual(
      rules.map((rule) => ({ ...rule, id: 'generated' })),
      [tierIds[1], tierIds[0]].map((productId) => ({
        id: 'generated',
        automation_id: automationId,
        created_at: createdAt,
        trigger_type: 'paid_subscription_started',
        scope: 'specific_paid_tier',
        product_id: productId,
        direction: null,
      })),
    );
    rules.forEach((rule) => assertGeneratedId(rule.id));
    assert.equal(new Set(rules.map((rule) => rule.id)).size, 2);
    assert.deepEqual(selectedTierIds, [tierIds[1], tierIds[0], tierIds[1]]);
    assert.equal(createdAt.toISOString(), '2026-01-02T03:04:05.678Z');
  });

  it('returns no selected-tier rules when no tiers are supplied', function () {
    assert.deepEqual(
      buildTriggerRuleRows({ automationId, scope: 'selected_paid', tierIds: [], createdAt }),
      [],
    );
  });

  it('generates fresh IDs for separate builds', function () {
    const options = { automationId, scope: 'free' as const, tierIds: [], createdAt };
    const [first] = buildTriggerRuleRows(options);
    const [second] = buildTriggerRuleRows(options);

    assertGeneratedId(first.id);
    assertGeneratedId(second.id);
    assert.notEqual(first.id, second.id);
  });

  it.each([null, undefined, 'unexpected'])('rejects invalid runtime scope %j', function (scope) {
    assert.throws(
      () =>
        buildTriggerRuleRows({
          automationId,
          // @ts-expect-error Exercise JavaScript callers that bypass the non-null scope type.
          scope,
          tierIds: [],
          createdAt,
        }),
      {
        errorType: 'InternalServerError',
        message: `Unexpected automation trigger tier scope: ${scope}`,
      },
    );
  });
});

describe('automationTriggerRuleDefinitionSchema', () => {
  it.each(['free', 'all_paid', 'selected_paid'] as const)('accepts built %s rules', (scope) => {
    const rules = buildTriggerRuleRows({ automationId, scope, tierIds, createdAt });
    for (const rule of rules) {
      expect(automationTriggerRuleDefinitionSchema.safeParse(rule).success).toBe(true);
    }
  });

  it.each([undefined, 'from', 'to'])('requires null direction, rejecting %j', (direction) => {
    expect(
      automationTriggerRuleDefinitionSchema.safeParse({
        trigger_type: 'free_signup',
        scope: null,
        product_id: null,
        direction,
      }).success,
    ).toBe(false);
  });

  it.each([undefined, null, '', 'invalid'])(
    'rejects invalid specific-tier product ID %j',
    (product_id) => {
      expect(
        automationTriggerRuleDefinitionSchema.safeParse({
          trigger_type: 'paid_subscription_started',
          scope: 'specific_paid_tier',
          product_id,
          direction: null,
        }).success,
      ).toBe(false);
    },
  );
});
