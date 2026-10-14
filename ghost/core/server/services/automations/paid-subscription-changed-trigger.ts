import errors from '@tryghost/errors';
import ObjectId from 'bson-objectid';
import { z } from 'zod';
import type { AutomationTriggerTierScope } from './automations-repository';

const tierIdsSchema = z
  .array(z.string().refine((value) => ObjectId.isValid(value)))
  .min(1)
  .transform((ids) => [...new Set(ids)]);

export const paidSubscriptionChangedTriggerOptionsSchema = z.strictObject({
  from: z.discriminatedUnion('type', [
    z.strictObject({ type: z.literal('any_paid_tier') }),
    z.strictObject({ type: z.literal('specific_tiers'), tier_ids: tierIdsSchema }),
  ]),
  to: z.discriminatedUnion('type', [
    z.strictObject({ type: z.literal('specific_tiers'), tier_ids: tierIdsSchema }),
    z.strictObject({ type: z.literal('canceled_auto_renew') }),
    z.strictObject({ type: z.literal('downgraded_to_free') }),
  ]),
});

export type PaidSubscriptionChangedTriggerOptions = z.infer<
  typeof paidSubscriptionChangedTriggerOptionsSchema
>;

/**
 * A change to a paid member's subscription, as seen by the member repository.
 *
 * Tier IDs are the member's tiers before (`from_tier_ids`) and after
 * (`to_tier_ids`) the change.
 */
export type PaidSubscriptionChange =
  | {
      type: 'tiers_changed';
      from_tier_ids: readonly string[];
      to_tier_ids: readonly string[];
    }
  | {
      type: 'canceled_auto_renew';
      from_tier_ids: readonly string[];
    }
  | {
      type: 'downgraded_to_free';
      from_tier_ids: readonly string[];
    };

const intersects = (a: readonly string[], b: readonly string[]): boolean =>
  a.some((id) => b.includes(id));

export function matchesPaidSubscriptionChange(
  options: Readonly<PaidSubscriptionChangedTriggerOptions>,
  change: Readonly<PaidSubscriptionChange>,
): boolean {
  const { from, to } = options;

  switch (from.type) {
    case 'any_paid_tier':
      if (change.from_tier_ids.length === 0) {
        return false;
      }
      break;
    case 'specific_tiers':
      if (!intersects(change.from_tier_ids, from.tier_ids)) {
        return false;
      }
      break;
    default: {
      const _exhaustive: never = from;
      throw new errors.IncorrectUsageError({
        message: `Unexpected "from" option: ${JSON.stringify(_exhaustive)}`,
      });
    }
  }

  switch (to.type) {
    case 'specific_tiers':
      // Only a move *into* the selected tiers counts. For example, with
      // Silver and Gold selected, Bronze to Silver triggers, but Silver to Gold
      // doesn't.
      return (
        change.type === 'tiers_changed' &&
        intersects(change.to_tier_ids, to.tier_ids) &&
        !intersects(change.from_tier_ids, to.tier_ids)
      );
    case 'canceled_auto_renew':
    case 'downgraded_to_free':
      return change.type === to.type;
    default: {
      const _exhaustive: never = to;
      throw new errors.IncorrectUsageError({
        message: `Unexpected "to" option: ${JSON.stringify(_exhaustive)}`,
      });
    }
  }
}

/**
 * Get the members who stay eligible while a run of this automation is in
 * progress.
 *
 * Steps check this audience before they run (see `poll.ts`). For example, an
 * automation for members who downgraded to free stops if the member starts
 * paying again.
 */
export function getPaidSubscriptionChangedAudience(
  options: Readonly<PaidSubscriptionChangedTriggerOptions>,
): { trigger_tier_scope: AutomationTriggerTierScope; trigger_tier_ids: readonly string[] } {
  switch (options.to.type) {
    case 'specific_tiers':
      return { trigger_tier_scope: 'selected_paid', trigger_tier_ids: options.to.tier_ids };
    case 'canceled_auto_renew':
      return { trigger_tier_scope: 'all_paid', trigger_tier_ids: [] };
    case 'downgraded_to_free':
      return { trigger_tier_scope: 'free', trigger_tier_ids: [] };
    default: {
      const _exhaustive: never = options.to;
      throw new errors.IncorrectUsageError({
        message: `Unexpected "to" option: ${JSON.stringify(_exhaustive)}`,
      });
    }
  }
}

export function getPaidSubscriptionChangedTierIds(
  options: Readonly<PaidSubscriptionChangedTriggerOptions>,
): string[] {
  return [
    ...new Set([
      ...(options.from.type === 'specific_tiers' ? options.from.tier_ids : []),
      ...(options.to.type === 'specific_tiers' ? options.to.tier_ids : []),
    ]),
  ];
}
