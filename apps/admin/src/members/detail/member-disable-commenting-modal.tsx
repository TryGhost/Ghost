import React from 'react';
import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, LoadingIndicator, Switch} from '@tryghost/shade/components';
import {toast} from 'sonner';
import {useDisableMemberCommenting} from '@tryghost/admin-x-framework/api/members';
import {useQueryClient} from '@tanstack/react-query';
import type {Member} from '@tryghost/admin-x-framework/api/members';

interface MemberDisableCommentingModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    member: Pick<Member, 'id' | 'name' | 'email'>;
}

// Matches Ember `disable-commenting.js:23` verbatim so the audit trail on the
// server stays consistent across the migration.
const DISABLE_REASON = 'Disabled from member settings';

/**
 * Confirms "Disable commenting" for a member. Ember parity:
 *   - Optional "Hide all previous comments" checkbox → `hide_comments=true`.
 *   - Reason is the fixed string above (Ember hardcodes the same).
 *   - Success toast reads "Commenting has been disabled for <name-or-email>."
 *
 * Uses Shade Dialog (not AlertDialog) because it hosts a form control that
 * changes the outcome, not just a yes/no choice.
 */
const MemberDisableCommentingModal: React.FC<MemberDisableCommentingModalProps> = ({open, onOpenChange, member}) => {
    const queryClient = useQueryClient();
    const disable = useDisableMemberCommenting();
    const [hideComments, setHideComments] = React.useState(false);

    // Reset the checkbox on every reopen so a stale selection can't leak into a
    // fresh flow.
    React.useEffect(() => {
        if (open) {
            setHideComments(false);
        }
    }, [open]);

    const displayName = member.name || member.email || 'this member';

    const onConfirm = async () => {
        try {
            await disable.mutateAsync({id: member.id, reason: DISABLE_REASON, hideComments});
        } catch {
            toast.error('Couldn’t disable commenting. Please try again.');
            return;
        }
        // Commit the success UX first, then fire-and-forget the extra
        // members-cache refresh. If the follow-up refetch fails we do NOT
        // want to flip an already-shown success toast to an error — the
        // disable itself succeeded and is reflected server-side.
        toast.success(`Commenting has been disabled for ${displayName}.`);
        onOpenChange(false);
        // The framework hook only invalidates CommentsResponseType; refresh
        // the members cache so the actions-menu label flips to "Enable
        // commenting" on the next render.
        void queryClient.invalidateQueries({queryKey: ['MembersResponseType']});
    };

    return (
        <Dialog open={open} onOpenChange={(next) => {
            if (disable.isPending) {
                return;
            }
            onOpenChange(next);
        }}>
            <DialogContent data-testid='disable-commenting-modal'>
                <DialogHeader>
                    <DialogTitle>Disable commenting</DialogTitle>
                    <DialogDescription>
                        <strong>{displayName}</strong> won’t be able to comment in the future. You can re-enable commenting anytime.
                    </DialogDescription>
                </DialogHeader>

                <div className='flex items-start justify-between gap-4'>
                    <div className='flex flex-col gap-0.5'>
                        <h4 className='text-sm font-medium'>Hide all previous comments</h4>
                    </div>
                    <Switch
                        aria-label='Hide all previous comments'
                        checked={hideComments}
                        data-testid='disable-commenting-hide-comments'
                        disabled={disable.isPending}
                        onCheckedChange={setHideComments}
                    />
                </div>

                <DialogFooter>
                    <Button
                        data-testid='cancel-disable-commenting'
                        disabled={disable.isPending}
                        variant='outline'
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        data-testid='confirm-disable-commenting'
                        disabled={disable.isPending}
                        onClick={() => void onConfirm()}
                    >
                        {disable.isPending ? (
                            <>
                                <LoadingIndicator size='sm' />
                                <span className='sr-only'>Disabling</span>
                            </>
                        ) : 'Disable commenting'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default MemberDisableCommentingModal;
