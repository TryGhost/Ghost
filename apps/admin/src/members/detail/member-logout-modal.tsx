import React from 'react';
import {AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, LoadingIndicator} from '@tryghost/shade/components';
import {toast} from 'sonner';
import {useMemberLogout} from '@tryghost/admin-x-framework/api/members';
import type {Member} from '@tryghost/admin-x-framework/api/members';

interface MemberLogoutModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    member: Pick<Member, 'id' | 'name' | 'email'>;
}

/**
 * Confirms the "Sign out of all devices" action. Ember parity:
 *   - Destructive intent — same red confirm button, plain "Sign out" label.
 *   - Success toast reads "<name-or-email> has been signed out from all devices."
 *     (Ember `logout-member.js:22`.)
 *   - We use a Shade AlertDialog (not Dialog) because there's no form state to
 *     manage and AlertDialog's stricter dismissal behaviour (no click-outside
 *     dismiss) matches Ember's destructive-modal semantics.
 */
const MemberLogoutModal: React.FC<MemberLogoutModalProps> = ({open, onOpenChange, member}) => {
    const logout = useMemberLogout();
    const displayName = member.name || member.email || 'This member';

    const onConfirm = async () => {
        try {
            await logout.mutateAsync({id: member.id});
            toast.success(`${displayName} has been signed out from all devices.`);
            onOpenChange(false);
        } catch {
            toast.error('Couldn’t sign the member out. Please try again.');
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={(next) => {
            // Block dismissal mid-request so the mutation always resolves before
            // the modal closes — matches the `drop` semantics on Ember's task.
            if (logout.isPending) {
                return;
            }
            onOpenChange(next);
        }}>
            <AlertDialogContent data-testid='logout-member-modal'>
                <AlertDialogHeader>
                    <AlertDialogTitle>Sign out member from all devices?</AlertDialogTitle>
                    <AlertDialogDescription>
                        <strong>{displayName}</strong> will be signed out of all active sessions, and will need to sign in again upon return.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={logout.isPending}>Cancel</AlertDialogCancel>
                    <Button
                        data-testid='confirm-logout-member'
                        disabled={logout.isPending}
                        variant='destructive'
                        onClick={() => void onConfirm()}
                    >
                        {logout.isPending ? (
                            <>
                                <LoadingIndicator size='sm' />
                                <span className='sr-only'>Signing out</span>
                            </>
                        ) : 'Sign out'}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default MemberLogoutModal;
