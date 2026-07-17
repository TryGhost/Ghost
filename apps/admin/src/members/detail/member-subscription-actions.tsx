import React from 'react';
import {Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, LoadingIndicator} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {toast} from 'sonner';
import {useEditMemberSubscription, useMembersFetching} from '@tryghost/admin-x-framework/api/members';
import type {MemberSubscription} from '@tryghost/admin-x-framework/api/members';

interface MemberSubscriptionActionsProps {
    memberId: string;
    subscription: MemberSubscription;
}

/**
 * Actions menu for a paid subscription row. Always exposes the two Stripe deep
 * links; adds "Cancel subscription" (soft cancel at period end) or "Continue
 * subscription" (undo a pending cancel) depending on the current state. Both
 * mutations hit `PUT /members/:id/subscriptions/:sub_id` via `useEditMemberSubscription`
 * — server-side the invalidation on that hook refreshes the member so the row
 * copy updates automatically once the change lands.
 *
 * Gift subs are omitted from the menu by the caller (Ember parity); comp subs
 * get their own menu in Phase 6.
 */
const MemberSubscriptionActions: React.FC<MemberSubscriptionActionsProps> = ({memberId, subscription}) => {
    const editSubscription = useEditMemberSubscription();
    // Keep the trigger disabled until the invalidated members refetch lands so a
    // user can't fire the same action twice in the window between the mutation
    // resolving and the row actually re-rendering with its new state.
    const membersRefetching = useMembersFetching();
    const busy = editSubscription.isPending || (editSubscription.isSuccess && membersRefetching);
    const isCanceled = subscription.status === 'canceled';
    const isSetToCancel = subscription.cancel_at_period_end;

    const runToggleCancel = (cancelAtPeriodEnd: boolean, successMessage: string, errorMessage: string) => {
        editSubscription.mutate(
            {memberId, subscriptionId: subscription.id, cancelAtPeriodEnd},
            {
                onSuccess: () => toast.success(successMessage),
                onError: () => toast.error(errorMessage)
            }
        );
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    aria-label='Subscription menu'
                    data-testid='subscription-actions'
                    disabled={busy}
                    size='sm'
                    variant='outline'
                >
                    {busy ? <LoadingIndicator size='sm' /> : <LucideIcon.MoreHorizontal />}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
                <DropdownMenuItem asChild>
                    <a
                        href={`https://dashboard.stripe.com/customers/${subscription.customer.id}`}
                        rel='noopener noreferrer'
                        target='_blank'
                    >
                        View Stripe customer
                    </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <a
                        href={`https://dashboard.stripe.com/subscriptions/${subscription.id}`}
                        rel='noopener noreferrer'
                        target='_blank'
                    >
                        View Stripe subscription
                    </a>
                </DropdownMenuItem>
                {!isCanceled && (
                    isSetToCancel ? (
                        <DropdownMenuItem
                            data-testid='continue-subscription'
                            onSelect={() => runToggleCancel(false, 'Subscription continued', 'Couldn’t continue subscription')}
                        >
                            Continue subscription
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem
                            className='text-destructive focus:text-destructive'
                            data-testid='cancel-subscription'
                            onSelect={() => runToggleCancel(true, 'Subscription canceled', 'Couldn’t cancel subscription')}
                        >
                            Cancel subscription
                        </DropdownMenuItem>
                    )
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default MemberSubscriptionActions;
