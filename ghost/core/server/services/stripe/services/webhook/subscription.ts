import errors from '@tryghost/errors';
import type { WebhookOutcome } from '../../tracking';
import { FAILURE_CODES } from '../../webhook/failures';
import type { Subscription } from '../../webhook/webhook-event';
import { linkOrConflict, type SubscriptionLinks } from './link-subscription';

interface Member {
  id: string;
  get(attribute: 'status'): unknown;
}

/** The parts of the member repository a subscription event uses. */
interface MemberRepository extends SubscriptionLinks {
  get(filter: { customer_id: string } | { id: string }): Promise<Member | null>;
  removeComplimentarySubscription(data: { id: string }): Promise<unknown>;
}

export interface SubscriptionDeps {
  memberRepository: MemberRepository;
}

/**
 * Handles a `customer.subscription.*` webhook event, which Stripe sends when a member's
 * subscription changes, by linking the subscription to the member whose Stripe customer it belongs
 * to, and removing their complimentary subscription once they're paid. The member repository saves
 * the subscription, fetching it from Stripe again. A subscription of a customer who isn't a member
 * is left alone.
 */
export async function saveSubscriptionChange(
  deps: SubscriptionDeps,
  { subscriptionId, customerId, prices }: Subscription,
): Promise<WebhookOutcome> {
  if (prices !== 1) {
    throw new errors.BadRequestError({
      code: FAILURE_CODES.unsupportedSubscription,
      message: 'Subscription should have exactly 1 price item',
    });
  }

  const { memberRepository } = deps;
  const member = await memberRepository.get({ customer_id: customerId });
  if (!member) {
    return { result: 'handled' };
  }

  await linkOrConflict(memberRepository, {
    id: member.id,
    subscription: { id: subscriptionId, customer: customerId },
  });

  const updatedMember = await memberRepository.get({ id: member.id });
  if (updatedMember?.get('status') === 'paid') {
    await memberRepository.removeComplimentarySubscription({ id: member.id });
  }
  return { result: 'handled' };
}
