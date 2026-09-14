import assert from 'node:assert/strict';

import {
  doesTriggerMatchMember,
  parseAutomationTrigger,
  serializeAutomationTrigger,
  automationTriggerSchema,
  type AutomationTrigger,
} from '../../../../../core/server/services/automations/automation-trigger';

const BRONZE = '6540000000000000000000b1';
const SILVER = '6540000000000000000000s1'.replace(/s/g, '5');
const GOLD = '6540000000000000000000c1';

describe('automation trigger', function () {
  describe('automationTriggerSchema', function () {
    it('accepts a free trigger', function () {
      assert.deepEqual(automationTriggerSchema.parse({ type: 'free' }), { type: 'free' });
    });

    it('accepts a paid trigger for all tiers', function () {
      assert.deepEqual(automationTriggerSchema.parse({ type: 'paid', tiers: 'all' }), {
        type: 'paid',
        tiers: 'all',
      });
    });

    it('accepts a paid trigger for specific tiers', function () {
      assert.deepEqual(automationTriggerSchema.parse({ type: 'paid', tiers: [BRONZE, SILVER] }), {
        type: 'paid',
        tiers: [BRONZE, SILVER],
      });
    });

    it('rejects a free trigger that carries tiers', function () {
      assert.equal(automationTriggerSchema.safeParse({ type: 'free', tiers: 'all' }).success, false);
    });

    it('rejects a paid trigger with no tiers field', function () {
      assert.equal(automationTriggerSchema.safeParse({ type: 'paid' }).success, false);
    });

    it('rejects a paid trigger with an empty tier list', function () {
      assert.equal(automationTriggerSchema.safeParse({ type: 'paid', tiers: [] }).success, false);
    });

    it('rejects a paid trigger with duplicate tiers', function () {
      assert.equal(
        automationTriggerSchema.safeParse({ type: 'paid', tiers: [BRONZE, BRONZE] }).success,
        false,
      );
    });

    it('rejects tier ids that are not object ids', function () {
      assert.equal(
        automationTriggerSchema.safeParse({ type: 'paid', tiers: ['not-an-object-id'] }).success,
        false,
      );
    });

    it('rejects unknown trigger types', function () {
      assert.equal(automationTriggerSchema.safeParse({ type: 'comped' }).success, false);
    });
  });

  describe('serializeAutomationTrigger / parseAutomationTrigger', function () {
    const cases: AutomationTrigger[] = [
      { type: 'free' },
      { type: 'paid', tiers: 'all' },
      { type: 'paid', tiers: [BRONZE, SILVER] },
    ];

    for (const trigger of cases) {
      it(`round-trips ${JSON.stringify(trigger)}`, function () {
        assert.deepEqual(parseAutomationTrigger(serializeAutomationTrigger(trigger)), trigger);
      });
    }

    it('returns null for null (an automation with no trigger)', function () {
      assert.equal(parseAutomationTrigger(null), null);
    });

    it('returns null for malformed JSON', function () {
      assert.equal(parseAutomationTrigger('{not json'), null);
    });

    it('returns null for well-formed JSON that is not a valid trigger', function () {
      assert.equal(parseAutomationTrigger('{"type":"comped"}'), null);
    });
  });

  describe('doesTriggerMatchMember', function () {
    it('matches a free trigger against a free member', function () {
      assert.equal(doesTriggerMatchMember({ type: 'free' }, { status: 'free', tierIds: [] }), true);
    });

    it('does not match a free trigger against a paid member', function () {
      assert.equal(
        doesTriggerMatchMember({ type: 'free' }, { status: 'paid', tierIds: [BRONZE] }),
        false,
      );
    });

    it('does not match a paid trigger against a free member', function () {
      assert.equal(
        doesTriggerMatchMember({ type: 'paid', tiers: 'all' }, { status: 'free', tierIds: [] }),
        false,
      );
    });

    it('matches an all-tiers paid trigger against any paid member', function () {
      assert.equal(
        doesTriggerMatchMember({ type: 'paid', tiers: 'all' }, { status: 'paid', tierIds: [GOLD] }),
        true,
      );
    });

    it('matches an all-tiers paid trigger against a gift member', function () {
      assert.equal(
        doesTriggerMatchMember({ type: 'paid', tiers: 'all' }, { status: 'gift', tierIds: [] }),
        true,
      );
    });

    it('matches a tier-specific trigger when the member holds one of the tiers', function () {
      assert.equal(
        doesTriggerMatchMember(
          { type: 'paid', tiers: [BRONZE, SILVER] },
          { status: 'paid', tierIds: [GOLD, SILVER] },
        ),
        true,
      );
    });

    it('does not match a tier-specific trigger when the member holds none of the tiers', function () {
      assert.equal(
        doesTriggerMatchMember(
          { type: 'paid', tiers: [BRONZE, SILVER] },
          { status: 'paid', tierIds: [GOLD] },
        ),
        false,
      );
    });

    it('does not match a tier-specific trigger for a member with no tiers', function () {
      assert.equal(
        doesTriggerMatchMember({ type: 'paid', tiers: [BRONZE] }, { status: 'paid', tierIds: [] }),
        false,
      );
    });
  });
});
