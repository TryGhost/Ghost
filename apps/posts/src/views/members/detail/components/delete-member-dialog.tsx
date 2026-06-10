import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    Button,
    Checkbox,
    Label
} from '@tryghost/shade/components';
import {hasActiveStripeSubscriptions} from '../subscription-data';
import {useEffect, useState} from 'react';
import type {Member} from '@tryghost/admin-x-framework/api/members';

/**
 * Delete member confirmation, with the optional "also cancel the Stripe
 * subscription" checkbox when the member has active paid subscriptions.
 * Port of the Ember members/modals/delete-member component.
 */
export function DeleteMemberDialog({member, open, onOpenChange, onConfirm}: {
    member: Member;
    open: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onConfirm: (cancelSubscriptions: boolean) => Promise<void>;
}) {
    const [cancelSubscriptions, setCancelSubscriptions] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (!open) {
            setCancelSubscriptions(false);
        }
    }, [open]);

    const showCancelOption = hasActiveStripeSubscriptions(member.subscriptions);

    const handleConfirm = async () => {
        setIsDeleting(true);
        try {
            await onConfirm(cancelSubscriptions);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete member account</AlertDialogTitle>
                    <AlertDialogDescription>
                        Permanently delete <strong>{member.email}</strong> from Ghost.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                {showCancelOption && (
                    <div className="flex items-start gap-3">
                        <Checkbox
                            checked={cancelSubscriptions}
                            id="cancel-stripe-subscriptions"
                            onCheckedChange={checked => setCancelSubscriptions(checked === true)}
                        />
                        <div className="grid gap-0.5">
                            <Label htmlFor="cancel-stripe-subscriptions">Also cancel subscription in Stripe</Label>
                            <p className="text-sm text-muted-foreground">
                                If disabled, the member&rsquo;s premium subscription will continue
                            </p>
                        </div>
                    </div>
                )}
                <AlertDialogFooter>
                    <Button
                        data-testid="cancel-delete-member"
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        data-testid="confirm-delete-member"
                        disabled={isDeleting}
                        type="button"
                        variant="destructive"
                        onClick={handleConfirm}
                    >
                        {cancelSubscriptions ? 'Delete member + Cancel subscription' : 'Delete member'}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
