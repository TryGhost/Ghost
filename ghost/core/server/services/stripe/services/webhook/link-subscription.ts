import errors from '@tryghost/errors';
import { isUniqueViolation } from '../../../../lib/db-errors';

/** Where a paid member came from, as the member repository saves it with their subscription. */
export interface MemberAttribution {
  id: string | null;
  url: string | null;
  type: string | null;
  referrerSource: string | null;
  referrerMedium: string | null;
  referrerUrl: string | null;
}

/**
 * A Stripe subscription to link to a member, as the member repository's `linkSubscription` takes
 * it: the member's id, and the subscription with its Stripe customer, which the repository fetches
 * from Stripe again to save. A checkout also passes the offer the buyer took and where they came
 * from.
 */
export interface SubscriptionLink {
  id: string;
  subscription: { id: string; customer: string };
  offerId?: string | undefined;
  attribution?: MemberAttribution;
}

/** The part of the member repository that links a Stripe subscription to a member. */
export interface SubscriptionLinks {
  linkSubscription(link: SubscriptionLink): Promise<unknown>;
}

/**
 * Links a subscription to a member. Two deliveries of events for the same subscription, such as
 * its `created` and `updated` events or Stripe retrying an event Ghost is still handling, can both
 * try to insert it, so the one that finds it saved already fails with a conflict, which Stripe
 * retries.
 */
export async function linkOrConflict(
  members: SubscriptionLinks,
  link: SubscriptionLink,
): Promise<void> {
  try {
    await members.linkSubscription(link);
  } catch (err) {
    if (!isUniqueViolation(err)) {
      throw err;
    }
    throw new errors.ConflictError({ err: err instanceof Error ? err : undefined });
  }
}
