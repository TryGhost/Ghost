import type { Tier } from '@tryghost/admin-x-framework/api/tiers';

/**
 * A part checkout can ask for, as it is edited: whether it's on, and the tiers it's asked on.
 * `allTiers` is every paid tier, including tiers added later, shown as every tier ticked;
 * otherwise `tierIds` are the tiers ticked.
 */
export type CollectFormState = {
  collect: boolean;
  allTiers: boolean;
  tierIds: string[];
};

/** A part as Ghost saves it: `tier_ids` left out covers every paid tier. */
type CollectSetting = { collect: false } | { collect: true; tier_ids?: string[] };

export const collectFormStateOf = (setting: CollectSetting | undefined): CollectFormState =>
  setting?.collect
    ? { collect: true, allTiers: !setting.tier_ids, tierIds: setting.tier_ids ?? [] }
    : { collect: false, allTiers: true, tierIds: [] };

/** The tiers a part is saved for: left out for every paid tier. */
export const tierIdsSettingOf = (state: CollectFormState): { tier_ids?: string[] } =>
  state.allTiers ? {} : { tier_ids: state.tierIds };

/** Whether a switched-on part is asked on no tier at all, which can't be saved. */
export const asksNoTier = (state: CollectFormState): boolean =>
  state.collect && !state.allTiers && !state.tierIds.length;

/**
 * Whether a part is on and the tiers it is asked on, as it is being edited: for Preview in
 * Stripe, and for saving a part with nothing else to set. Switched on for no tier, it asks
 * nothing, as validation stops that being saved.
 */
export const collectSettingOf = (state: CollectFormState): CollectSetting =>
  state.collect && !asksNoTier(state)
    ? { collect: true, ...tierIdsSettingOf(state) }
    : { collect: false };

/**
 * The tiers the sketch tags a part with: empty when it is asked on every paid tier, so there
 * is nothing to tag.
 */
export function audienceOf(state: CollectFormState, tiers: Tier[]): string {
  if (state.allTiers) {
    return '';
  }
  return tiers
    .filter((tier) => state.tierIds.includes(tier.id))
    .map((tier) => tier.name)
    .join(', ');
}

/**
 * The tiers ticked in "Collect for" as the picker changes them. Ticking every active paid tier
 * means every paid tier, so tiers added later are covered too.
 */
export function tierChoiceOf(
  tierIds: string[],
  activeTierIds: string[],
): Pick<CollectFormState, 'allTiers' | 'tierIds'> {
  const allTiers = activeTierIds.length > 0 && activeTierIds.every((id) => tierIds.includes(id));
  return { allTiers, tierIds };
}
