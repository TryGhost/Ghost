import type {Member, MemberSubscription} from '@tryghost/admin-x-framework/api/members';

// Same allow-list Ember uses in `delete-member.js:22-27` and the comp flow
// (`member-add-comp-modal.tsx:14`). Kept as a Set for O(1) status lookups.
const CANCELABLE_STATUSES = new Set(['active', 'trialing', 'unpaid', 'past_due']);

/**
 * True when the member has at least one subscription whose status Ember treats
 * as still needing a Stripe-side cancel — i.e. worth showing the "Also cancel
 * subscription in Stripe" checkbox in the delete confirmation.
 *
 * Note: mirrors Ember exactly and does NOT filter by classification (paid vs
 * comp vs gift). Comp/gift subs have an empty `sub.id` so the server-side
 * cancel call is a no-op, but we don't gate the checkbox on it here.
 */
export function hasCancelableStripeSubscription(member: Pick<Member, 'subscriptions'>): boolean {
    const subscriptions: MemberSubscription[] = member.subscriptions ?? [];
    return subscriptions.some(sub => CANCELABLE_STATUSES.has(sub.status));
}

/**
 * The confirm button label toggles based on the checkbox state — Ember calls
 * this out visually so the admin sees they're about to trigger *two* server
 * operations, not one. Keep the exact strings in sync with Ember
 * `delete-member.hbs:44`.
 */
export function getDeleteMemberButtonLabel(cancelStripeSubscription: boolean): string {
    return cancelStripeSubscription ? 'Delete member + Cancel subscription' : 'Delete member';
}
