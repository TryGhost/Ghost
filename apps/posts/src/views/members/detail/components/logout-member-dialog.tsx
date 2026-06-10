import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    Button
} from '@tryghost/shade/components';
import {useState} from 'react';
import type {Member} from '@tryghost/admin-x-framework/api/members';

/**
 * "Sign out of all devices" confirmation. Port of the Ember
 * members/modals/logout-member component.
 */
export function LogoutMemberDialog({member, open, onOpenChange, onConfirm}: {
    member: Member;
    open: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onConfirm: () => Promise<void>;
}) {
    const [isSigningOut, setIsSigningOut] = useState(false);

    const handleConfirm = async () => {
        setIsSigningOut(true);
        try {
            await onConfirm();
        } finally {
            setIsSigningOut(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Sign out member from all devices?</AlertDialogTitle>
                    <AlertDialogDescription>
                        <strong>{member.name || member.email}</strong> will be signed out of all active sessions,
                        and will need to sign in again upon return.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button disabled={isSigningOut} type="button" variant="destructive" onClick={handleConfirm}>
                        Sign out
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
