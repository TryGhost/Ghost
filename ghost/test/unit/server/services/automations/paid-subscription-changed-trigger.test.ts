import assert from 'node:assert/strict';
import ObjectId from 'bson-objectid';
import {
  getPaidSubscriptionChangedAudience,
  getPaidSubscriptionChangedTierIds,
  matchesPaidSubscriptionChange,
  paidSubscriptionChangedTriggerOptionsSchema,
  type PaidSubscriptionChange,
  type PaidSubscriptionChangedTriggerOptions,
} from '../../../../../core/server/services/automations/paid-subscription-changed-trigger';

describe('paid subscription changed trigger', function () {
  const bronze = ObjectId().toHexString();
  const silver = ObjectId().toHexString();
  const gold = ObjectId().toHexString();

  const tiersChanged = (fromTierIds: string[], toTierIds: string[]): PaidSubscriptionChange => ({
    type: 'tiers_changed',
    from_tier_ids: fromTierIds,
    to_tier_ids: toTierIds,
  });

  describe('matchesPaidSubscriptionChange', function () {
    describe('from any paid tier to specific tiers', function () {
      const options: PaidSubscriptionChangedTriggerOptions = {
        from: { type: 'any_paid_tier' },
        to: { type: 'specific_tiers', tier_ids: [silver, gold] },
      };

      it('matches moves into the selected tiers', function () {
        assert(matchesPaidSubscriptionChange(options, tiersChanged([bronze], [silver])));
        assert(matchesPaidSubscriptionChange(options, tiersChanged([bronze], [gold])));
      });

      it('does not match moves between the selected tiers', function () {
        assert(!matchesPaidSubscriptionChange(options, tiersChanged([silver], [gold])));
        assert(!matchesPaidSubscriptionChange(options, tiersChanged([gold], [silver])));
      });

      it('does not match moves to other tiers', function () {
        assert(!matchesPaidSubscriptionChange(options, tiersChanged([gold], [bronze])));
      });

      it('does not match other kinds of changes', function () {
        assert(
          !matchesPaidSubscriptionChange(options, {
            type: 'canceled_auto_renew',
            from_tier_ids: [bronze],
          }),
        );
        assert(
          !matchesPaidSubscriptionChange(options, {
            type: 'downgraded_to_free',
            from_tier_ids: [bronze],
          }),
        );
      });

      it('requires the member to have had a paid tier', function () {
        assert(!matchesPaidSubscriptionChange(options, tiersChanged([], [silver])));
      });
    });

    describe('from specific tiers to specific tiers', function () {
      const options: PaidSubscriptionChangedTriggerOptions = {
        from: { type: 'specific_tiers', tier_ids: [bronze] },
        to: { type: 'specific_tiers', tier_ids: [gold] },
      };

      it('matches moves between the selected tiers', function () {
        assert(matchesPaidSubscriptionChange(options, tiersChanged([bronze], [gold])));
      });

      it('does not match moves from other tiers', function () {
        assert(!matchesPaidSubscriptionChange(options, tiersChanged([silver], [gold])));
      });
    });

    for (const type of ['canceled_auto_renew', 'downgraded_to_free'] as const) {
      describe(`to ${type}`, function () {
        it('matches from any paid tier', function () {
          const options: PaidSubscriptionChangedTriggerOptions = {
            from: { type: 'any_paid_tier' },
            to: { type },
          };
          assert(matchesPaidSubscriptionChange(options, { type, from_tier_ids: [bronze] }));
          assert(!matchesPaidSubscriptionChange(options, tiersChanged([bronze], [silver])));
        });

        it('only matches the selected "from" tiers', function () {
          const options: PaidSubscriptionChangedTriggerOptions = {
            from: { type: 'specific_tiers', tier_ids: [silver, gold] },
            to: { type },
          };
          assert(matchesPaidSubscriptionChange(options, { type, from_tier_ids: [gold] }));
          assert(!matchesPaidSubscriptionChange(options, { type, from_tier_ids: [bronze] }));
        });
      });
    }
  });

  describe('getPaidSubscriptionChangedAudience', function () {
    it('keeps members in the "to" tiers eligible', function () {
      assert.deepEqual(
        getPaidSubscriptionChangedAudience({
          from: { type: 'any_paid_tier' },
          to: { type: 'specific_tiers', tier_ids: [silver] },
        }),
        { trigger_tier_scope: 'selected_paid', trigger_tier_ids: [silver] },
      );
    });

    it('keeps paid members eligible after canceling auto-renew', function () {
      assert.deepEqual(
        getPaidSubscriptionChangedAudience({
          from: { type: 'any_paid_tier' },
          to: { type: 'canceled_auto_renew' },
        }),
        { trigger_tier_scope: 'all_paid', trigger_tier_ids: [] },
      );
    });

    it('keeps free members eligible after downgrading', function () {
      assert.deepEqual(
        getPaidSubscriptionChangedAudience({
          from: { type: 'specific_tiers', tier_ids: [silver] },
          to: { type: 'downgraded_to_free' },
        }),
        { trigger_tier_scope: 'free', trigger_tier_ids: [] },
      );
    });
  });

  describe('getPaidSubscriptionChangedTierIds', function () {
    it('returns every referenced tier once', function () {
      assert.deepEqual(
        getPaidSubscriptionChangedTierIds({
          from: { type: 'specific_tiers', tier_ids: [bronze, silver] },
          to: { type: 'specific_tiers', tier_ids: [silver, gold] },
        }),
        [bronze, silver, gold],
      );
    });
  });

  describe('paidSubscriptionChangedTriggerOptionsSchema', function () {
    it('removes duplicate tiers', function () {
      assert.deepEqual(
        paidSubscriptionChangedTriggerOptionsSchema.parse({
          from: { type: 'specific_tiers', tier_ids: [bronze, bronze] },
          to: { type: 'downgraded_to_free' },
        }),
        {
          from: { type: 'specific_tiers', tier_ids: [bronze] },
          to: { type: 'downgraded_to_free' },
        },
      );
    });

    it('rejects invalid options', function () {
      for (const options of [
        {},
        { from: { type: 'any_paid_tier' } },
        { from: { type: 'any_paid_tier' }, to: { type: 'specific_tiers', tier_ids: [] } },
        { from: { type: 'specific_tiers' }, to: { type: 'downgraded_to_free' } },
        { from: { type: 'any_paid_tier' }, to: { type: 'specific_tiers', tier_ids: ['nope'] } },
        { from: { type: 'any_paid_tier' }, to: { type: 'unknown' } },
        { from: { type: 'any_paid_tier', extra: true }, to: { type: 'downgraded_to_free' } },
      ]) {
        assert(
          !paidSubscriptionChangedTriggerOptionsSchema.safeParse(options).success,
          JSON.stringify(options),
        );
      }
    });

    it('allows overlapping "from" and "to" tiers', function () {
      // The UI prevents this, but the backend doesn't need to.
      assert(
        paidSubscriptionChangedTriggerOptionsSchema.safeParse({
          from: { type: 'specific_tiers', tier_ids: [silver] },
          to: { type: 'specific_tiers', tier_ids: [silver] },
        }).success,
      );
    });
  });
});
