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

type PostTier = PostRelationLike & { type?: string };

/** Public/member reads include the free tier, which cannot grant specific-tier access. */
export function selectedTierIds(tiers: ReadonlyArray<PostTier>): string[] {
  return tiers
    .filter((tier) => tier.type !== 'free')
    .map((tier) => tier.id)
    .filter((id): id is string => !!id);
}

/** The post's own tiers as relations, for a write that keeps them as they are. */
export function postTiers(tiers: ReadonlyArray<PostTier>): PostRelationLike[] {
  return selectedTierIds(tiers).map((id) => ({ id }));
}

/**
 * The tier relations a selection writes, in option order so the payload does
 * not depend on the order the writer ticked the boxes. A selected tier the
 * browse did not return is kept, so a partial list cannot drop it.
 */
export function tiersFromSelection(
  options: TierOption[],
  selected: ReadonlySet<string>,
): PostRelationLike[] {
  const offered = new Set(options.map((option) => option.id));
  const listed = options.filter((option) => selected.has(option.id)).map((option) => option.id);
  const unlisted = [...selected].filter((id) => !offered.has(id));

  return [...listed, ...unlisted].map((id) => ({ id }));
}
