import { describe, expect, it } from 'vitest';
import type { AutomationTrigger } from '@tryghost/admin-x-framework/api/automations';
import {
  NEW_PAID_SUBSCRIPTION_CHANGED_TRIGGER,
  getTriggerAudience,
  getTriggerError,
  getTriggerTierIds,
  hasPickedTrigger,
  withTrigger,
} from './automation-trigger';

const changed = (
  triggerOptions: Extract<
    AutomationTrigger,
    { trigger_type: 'paid_subscription_changed' }
  >['trigger_options'],
): AutomationTrigger => ({
  ...NEW_PAID_SUBSCRIPTION_CHANGED_TRIGGER,
  trigger_options: triggerOptions,
});

describe('automation triggers', () => {
  it('knows whether a trigger was picked', () => {
    expect(hasPickedTrigger({ trigger_tier_scope: null, trigger_tier_ids: null })).toBe(false);
    expect(hasPickedTrigger({ trigger_tier_scope: 'free', trigger_tier_ids: null })).toBe(true);
    expect(hasPickedTrigger(NEW_PAID_SUBSCRIPTION_CHANGED_TRIGGER)).toBe(true);
  });

  it('lists every referenced tier', () => {
    expect(
      getTriggerTierIds({ trigger_tier_scope: 'selected_paid', trigger_tier_ids: ['gold'] }),
    ).toEqual(['gold']);
    expect(
      getTriggerTierIds(
        changed({
          from: { type: 'specific_tiers', tier_ids: ['bronze'] },
          to: { type: 'specific_tiers', tier_ids: ['gold'] },
        }),
      ),
    ).toEqual(['bronze', 'gold']);
  });

  it('derives who stays eligible from "To"', () => {
    expect(
      getTriggerAudience(
        changed({
          from: { type: 'any_paid_tier' },
          to: { type: 'specific_tiers', tier_ids: ['gold'] },
        }),
      ),
    ).toEqual({ trigger_tier_scope: 'selected_paid', trigger_tier_ids: ['gold'] });
    expect(
      getTriggerAudience(
        changed({ from: { type: 'any_paid_tier' }, to: { type: 'canceled_auto_renew' } }),
      ),
    ).toEqual({ trigger_tier_scope: 'all_paid', trigger_tier_ids: [] });
    expect(
      getTriggerAudience(
        changed({ from: { type: 'any_paid_tier' }, to: { type: 'downgraded_to_free' } }),
      ),
    ).toEqual({ trigger_tier_scope: 'free', trigger_tier_ids: [] });
  });

  it('requires tiers when specific tiers are chosen', () => {
    expect(getTriggerError(NEW_PAID_SUBSCRIPTION_CHANGED_TRIGGER)).toBe(
      'Select at least one tier to change to.',
    );
    expect(
      getTriggerError(
        changed({
          from: { type: 'specific_tiers', tier_ids: [] },
          to: { type: 'downgraded_to_free' },
        }),
      ),
    ).toBe('Select at least one tier to change from.');
    expect(
      getTriggerError(
        changed({
          from: { type: 'any_paid_tier' },
          to: { type: 'specific_tiers', tier_ids: ['gold'] },
        }),
      ),
    ).toBeNull();
    expect(getTriggerError({ trigger_tier_scope: 'selected_paid', trigger_tier_ids: [] })).toBe(
      'Select at least one paid tier.',
    );
  });

  it('replaces the whole trigger', () => {
    const automation = {
      name: 'Welcome',
      trigger_type: 'member_sign_up' as const,
      trigger_options: null,
      trigger_tier_scope: 'selected_paid' as const,
      trigger_tier_ids: ['gold'],
    };
    expect(withTrigger(automation, NEW_PAID_SUBSCRIPTION_CHANGED_TRIGGER)).toEqual({
      name: 'Welcome',
      ...NEW_PAID_SUBSCRIPTION_CHANGED_TRIGGER,
    });
    expect(
      withTrigger(
        { name: 'Welcome', ...NEW_PAID_SUBSCRIPTION_CHANGED_TRIGGER },
        { trigger_tier_scope: 'free', trigger_tier_ids: null },
      ),
    ).toEqual({ name: 'Welcome', trigger_tier_scope: 'free', trigger_tier_ids: null });
  });
});
