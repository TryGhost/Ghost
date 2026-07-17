import React from 'react';
import {AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, LoadingIndicator} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {toast} from 'sonner';
import {useEditMember, useMembersFetching} from '@tryghost/admin-x-framework/api/members';
import type {Member} from '@tryghost/admin-x-framework/api/members';

interface MemberSubscriptionCompActionsProps {
    member: Member;
    tierId: string;
}

/**
 * Actions menu for a complimentary subscription row. The only action here is
 * "Remove complimentary subscription" — Ember flow: filter the tier out of
 * `member.tiers` and PUT the remaining set back. Gift subscriptions get NO menu
 * (Ember parity) and are gated out by the caller.
 */
const MemberSubscriptionCompActions: React.FC<MemberSubscriptionCompActionsProps> = ({member, tierId}) => {
    const editMember = useEditMember();
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    // Keep the trigger disabled through the invalidated members refetch so the
    // menu can't re-open in a stale state and fire the same removal twice.
    const membersRefetching = useMembersFetching();
    const busy = editMember.isPending || (editMember.isSuccess && membersRefetching);

    const onConfirmRemove = () => {
        // Preserve `expiry_at` on the surviving tiers — the server pivot update
        // treats a missing expiry_at as `null` and would silently wipe the
        // expiration for any other comp tier on this member.
        const remainingTiers = (member.tiers ?? [])
            .filter(tier => tier.id !== tierId)
            .map(tier => ({id: tier.id, expiry_at: tier.expiry_at ?? null}));
        // Include `email` to match Ember exactly (`gh-member-settings-form.js:194-198`).
        editMember.mutate(
            {id: member.id, email: member.email, tiers: remainingTiers},
            {
                onSuccess: () => {
                    toast.success('Complimentary subscription removed');
                    setConfirmOpen(false);
                },
                onError: () => toast.error('Couldn’t remove complimentary subscription')
            }
        );
    };

    return (
        <>
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
                    <DropdownMenuItem
                        className='text-destructive focus:text-destructive'
                        data-testid='remove-complimentary'
                        onSelect={() => setConfirmOpen(true)}
                    >
                        Remove complimentary subscription
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={confirmOpen} onOpenChange={(open) => {
                if (!editMember.isPending) {
                    setConfirmOpen(open);
                }
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove complimentary subscription?</AlertDialogTitle>
                        <AlertDialogDescription>
                            The member will lose access to this tier immediately.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={editMember.isPending}>Cancel</AlertDialogCancel>
                        {/* Deliberately not `AlertDialogAction` — Radix auto-closes the
                            dialog when Action fires, which would race the mutation and
                            hide the loading state. Own the close via `onSuccess` instead. */}
                        <Button
                            data-testid='confirm-remove-complimentary'
                            disabled={editMember.isPending}
                            variant='destructive'
                            onClick={onConfirmRemove}
                        >
                            {editMember.isPending ? (
                                <>
                                    <LoadingIndicator size='sm' />
                                    <span className='sr-only'>Removing</span>
                                </>
                            ) : 'Remove'}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default MemberSubscriptionCompActions;
