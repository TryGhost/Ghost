import React from 'react';
import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, LoadingIndicator, Switch} from '@tryghost/shade/components';
import {getDeleteMemberButtonLabel, hasCancelableStripeSubscription} from './member-delete';
import {toast} from 'sonner';
import {useDeleteMember} from '@tryghost/admin-x-framework/api/members';
import {useNavigate} from '@tryghost/admin-x-framework';
import type {Member} from '@tryghost/admin-x-framework/api/members';

interface MemberDeleteModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    member: Member;
    /**
     * Invoked right before we `navigate('/members')` so the parent's
     * unsaved-changes blocker doesn't intercept the redirect and pop a
     * "Discard changes?" dialog for a member that has just been deleted.
     */
    allowLeaveWithUnsavedChanges: () => void;
}

/**
 * Confirms permanent member deletion. Mirrors Ember `delete-member` exactly:
 *   - Shows the "Also cancel subscription in Stripe" toggle iff the member has
 *     at least one cancelable Stripe subscription
 *     (`hasCancelableStripeSubscription`).
 *   - Confirm button label switches to "Delete member + Cancel subscription"
 *     when the checkbox is on, so the admin sees the two-op flow.
 *   - On success, navigates to /members (Ember `controllers/member.js:184`
 *     `router.transitionTo(membersListPath)`).
 *
 * Uses Shade Dialog rather than AlertDialog because it needs to host the
 * checkbox and a dynamic confirm label — behaviours AlertDialog's simpler
 * cancel/action pair doesn't support cleanly.
 */
const MemberDeleteModal: React.FC<MemberDeleteModalProps> = ({open, onOpenChange, member, allowLeaveWithUnsavedChanges}) => {
    const navigate = useNavigate();
    const deleteMember = useDeleteMember();
    const [cancelStripe, setCancelStripe] = React.useState(false);

    // Reset the checkbox on every reopen — a lingering true state across opens
    // would be a footgun (last time you deleted, you meant to cancel Stripe; not
    // necessarily this time).
    React.useEffect(() => {
        if (open) {
            setCancelStripe(false);
        }
    }, [open]);

    const showCancelStripeToggle = hasCancelableStripeSubscription(member);
    // Members can be created without an email (Ember has the same gap). Fall
    // back through name → "this member" so we never render `<strong></strong>`
    // in the confirmation body or a bare " was deleted." in the toast.
    const displayIdentity = member.email || member.name || 'this member';

    const onConfirm = async () => {
        try {
            // If the toggle is hidden (no cancelable sub), always send cancel:false
            // — sending true against a member with no active Stripe sub is a no-op
            // server-side, but sending it based on stale UI state is a smell.
            const cancel = showCancelStripeToggle && cancelStripe;
            await deleteMember.mutateAsync({id: member.id, cancel});
            toast.success(cancel
                ? `${displayIdentity} was deleted and their Stripe subscription was cancelled.`
                : `${displayIdentity} was deleted.`);
            onOpenChange(false);
            // Bypass the unsaved-changes blocker: the member no longer exists,
            // so there's nothing meaningful to keep editing.
            allowLeaveWithUnsavedChanges();
            navigate('/members');
        } catch {
            toast.error('Couldn’t delete the member. Please try again.');
        }
    };

    return (
        <Dialog open={open} onOpenChange={(next) => {
            // Prevent close during the network round-trip so a half-canceled
            // Stripe / half-deleted state can't leak through the UI.
            if (deleteMember.isPending) {
                return;
            }
            onOpenChange(next);
        }}>
            <DialogContent data-testid='delete-member-modal'>
                <DialogHeader>
                    <DialogTitle>Delete member account</DialogTitle>
                    <DialogDescription>
                        Permanently delete <strong>{displayIdentity}</strong> from Ghost.
                    </DialogDescription>
                </DialogHeader>

                {showCancelStripeToggle && (
                    <div className='flex items-start justify-between gap-4'>
                        <div className='flex flex-col gap-0.5'>
                            <h4 className='text-sm font-medium'>Also cancel subscription in Stripe</h4>
                            <p className='text-sm text-muted-foreground'>If disabled, the member’s premium subscription will continue</p>
                        </div>
                        <Switch
                            aria-label='Also cancel subscription in Stripe'
                            checked={cancelStripe}
                            data-testid='delete-member-cancel-stripe'
                            disabled={deleteMember.isPending}
                            onCheckedChange={setCancelStripe}
                        />
                    </div>
                )}

                <DialogFooter>
                    <Button
                        data-testid='cancel-delete-member'
                        disabled={deleteMember.isPending}
                        variant='outline'
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        data-testid='confirm-delete-member'
                        disabled={deleteMember.isPending}
                        variant='destructive'
                        onClick={() => void onConfirm()}
                    >
                        {deleteMember.isPending ? (
                            <>
                                <LoadingIndicator size='sm' />
                                <span className='sr-only'>Deleting</span>
                            </>
                        ) : getDeleteMemberButtonLabel(cancelStripe && showCancelStripeToggle)}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default MemberDeleteModal;
