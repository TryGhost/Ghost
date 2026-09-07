import { getPaidActiveTiers, type Tier } from '@tryghost/admin-x-framework/api/tiers';
import type { PostRelationLike } from '@/editor/engine/change-tracker';

export interface VisibilityOption {
  value: 'public' | 'members' | 'paid' | 'tiers';
  label: string;
}

export const VISIBILITY_OPTIONS: readonly VisibilityOption[] = [
  { value: 'public', label: 'Public' },
  { value: 'members', label: 'Members only' },
  { value: 'paid', label: 'Paid-members only' },
  { value: 'tiers', label: 'Specific tier(s)' },
];

/**
 * The visibility the select shows. A post carries none until its first save
 * applies the site default, so the setting stands in until then.
 */
export function selectedVisibility(
  postVisibility: string | null | undefined,
  defaultContentVisibility: string | null | undefined,
): string {
  return postVisibility || defaultContentVisibility || 'public';
}

export interface TierOption {
  id: string;
  name: string;
  archived: boolean;
}

/** The pickable tiers: paid only, active before archived, as the tier pickers order them. */
export function tierOptions(tiers: Tier[] | undefined): TierOption[] {
  const paid = (tiers ?? []).filter((tier) => tier.type === 'paid');
  const active = getPaidActiveTiers(paid);
  const archived = paid.filter((tier) => !tier.active);

  return [...active, ...archived].map((tier) => ({
    id: tier.id,
    name: tier.name,
    archived: !tier.active,
  }));
}

/** The post's tiers as ids, dropping the relations the server sent without one. */
export function selectedTierIds(tiers: ReadonlyArray<PostRelationLike>): string[] {
  return tiers.map((tier) => tier.id).filter((id): id is string => !!id);
}

/** The post's own tiers as relations, for a write that keeps them as they are. */
export function postTiers(tiers: ReadonlyArray<PostRelationLike>): PostRelationLike[] {
  return selectedTierIds(tiers).map((id) => ({ id }));
}

/**
 * The tier relations a selection writes, in option order so the payload does
 * not depend on the order the writer ticked the boxes.
 */
export function tiersFromSelection(
  options: TierOption[],
  selected: ReadonlySet<string>,
): PostRelationLike[] {
  return options.filter((option) => selected.has(option.id)).map((option) => ({ id: option.id }));
}

/**
 * Whether a visibility choice can be saved. The write contract drops
 * `visibility: 'tiers'` when no tiers accompany it, so that pairing is held
 * back rather than sent and answered with the post's unchanged visibility.
 */
export function isCommittableAccess(visibility: string, tierCount: number): boolean {
  return visibility !== 'tiers' || tierCount > 0;
}
