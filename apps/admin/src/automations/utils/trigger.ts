import type {
  AutomationDetail,
  AutomationLabelTrigger,
  AutomationTierTrigger,
  AutomationTrigger,
} from '@tryghost/admin-x-framework/api/automations';

/**
 * A membership trigger as the backend accepts it: backends that predate trigger types
 * reject `trigger_type` and `trigger_label_ids`, so those keys are only added when supported.
 */
export const membershipTrigger = (
  tiers: AutomationTierTrigger,
  supportsTriggerTypes: boolean,
): AutomationTrigger =>
  supportsTriggerTypes
    ? { ...tiers, trigger_type: 'membership_started', trigger_label_ids: null }
    : tiers;

export const labelTrigger = (labelIds: readonly string[]): AutomationLabelTrigger => ({
  trigger_type: 'label_added',
  trigger_label_ids: labelIds,
  trigger_tier_scope: null,
  trigger_tier_ids: null,
});

/** Replaces the automation's whole trigger, so no field of the previous one lingers. */
export const withTrigger = (
  automation: AutomationDetail,
  trigger: AutomationTrigger,
): AutomationDetail => ({
  ...automation,
  // Left out of the request when the new trigger doesn't set them.
  trigger_type: undefined,
  trigger_label_ids: undefined,
  ...trigger,
});
