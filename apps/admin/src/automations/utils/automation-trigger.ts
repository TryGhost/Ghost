import type {
  AutomationTrigger,
  PaidSubscriptionChangedAutomationTrigger,
} from '@tryghost/admin-x-framework/api/automations';

export const NEW_PAID_SUBSCRIPTION_CHANGED_TRIGGER: PaidSubscriptionChangedAutomationTrigger = {
  trigger_type: 'paid_subscription_changed',
  trigger_options: {
    from: { type: 'any_paid_tier' },
    to: { type: 'specific_tiers', tier_ids: [] },
  },
  trigger_tier_scope: null,
  trigger_tier_ids: null,
};

export const isPaidSubscriptionChangedTrigger = (
  trigger: AutomationTrigger,
): trigger is PaidSubscriptionChangedAutomationTrigger =>
  trigger.trigger_type === 'paid_subscription_changed';

/**
 * Has the user picked a trigger for this automation yet?
 */
export const hasPickedTrigger = (trigger: AutomationTrigger): boolean =>
  isPaidSubscriptionChangedTrigger(trigger) || trigger.trigger_tier_scope !== null;

/**
 * Every tier the trigger references.
 */
export const getTriggerTierIds = (trigger: AutomationTrigger): readonly string[] => {
  if (!isPaidSubscriptionChangedTrigger(trigger)) {
    return trigger.trigger_tier_ids ?? [];
  }
  const { from, to } = trigger.trigger_options;
  return [
    ...(from.type === 'specific_tiers' ? from.tier_ids : []),
    ...(to.type === 'specific_tiers' ? to.tier_ids : []),
  ];
};

/**
 * Get the members who stay eligible while a run is in progress. This mirrors
 * the backend, which stops runs for members who leave this audience.
 */
export const getTriggerAudience = (
  trigger: AutomationTrigger,
): Pick<AutomationTrigger, 'trigger_tier_scope'> & { trigger_tier_ids: readonly string[] } => {
  if (!isPaidSubscriptionChangedTrigger(trigger)) {
    return {
      trigger_tier_scope: trigger.trigger_tier_scope,
      trigger_tier_ids: trigger.trigger_tier_ids ?? [],
    };
  }
  const { to } = trigger.trigger_options;
  switch (to.type) {
    case 'specific_tiers':
      return { trigger_tier_scope: 'selected_paid', trigger_tier_ids: to.tier_ids };
    case 'canceled_auto_renew':
      return { trigger_tier_scope: 'all_paid', trigger_tier_ids: [] };
    case 'downgraded_to_free':
      return { trigger_tier_scope: 'free', trigger_tier_ids: [] };
    default: {
      const _exhaustive: never = to;
      throw new Error(`Unknown "to" option: ${JSON.stringify(_exhaustive)}`);
    }
  }
};

/**
 * Get a validation error for the trigger, if any.
 */
export const getTriggerError = (trigger: AutomationTrigger): string | null => {
  if (!isPaidSubscriptionChangedTrigger(trigger)) {
    return trigger.trigger_tier_scope === 'selected_paid' && !trigger.trigger_tier_ids.length
      ? 'Select at least one paid tier.'
      : null;
  }
  const { from, to } = trigger.trigger_options;
  if (from.type === 'specific_tiers' && !from.tier_ids.length) {
    return 'Select at least one tier to change from.';
  }
  if (to.type === 'specific_tiers' && !to.tier_ids.length) {
    return 'Select at least one tier to change to.';
  }
  return null;
};

/**
 * Replace an automation's trigger. Use this instead of spreading, which can mix
 * fields from different trigger types.
 */
export const withTrigger = <T extends AutomationTrigger>(
  automation: T,
  trigger: AutomationTrigger,
): Omit<T, keyof AutomationTrigger> & AutomationTrigger => {
  const rest: Partial<AutomationTrigger> = { ...automation };
  delete rest.trigger_type;
  delete rest.trigger_options;
  delete rest.trigger_tier_scope;
  delete rest.trigger_tier_ids;
  return { ...(rest as Omit<T, keyof AutomationTrigger>), ...trigger };
};
