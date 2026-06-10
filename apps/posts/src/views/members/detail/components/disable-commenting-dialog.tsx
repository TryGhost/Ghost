import {
    Button,
    Checkbox,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Label
} from '@tryghost/shade/components';
import {useEffect, useState} from 'react';
import type {Member} from '@tryghost/admin-x-framework/api/members';

/**
 * Disable commenting confirmation with the "hide all previous comments"
 * option. Port of the Ember members/modals/disable-commenting component.
 */
export function DisableCommentingDialog({member, open, onOpenChange, onConfirm}: {
    member: Member;
    open: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onConfirm: (hideComments: boolean) => Promise<void>;
}) {
    const [hideComments, setHideComments] = useState(false);
    const [isDisabling, setIsDisabling] = useState(false);

    useEffect(() => {
        if (!open) {
            setHideComments(false);
        }
    }, [open]);

    const handleConfirm = async () => {
        setIsDisabling(true);
        try {
            await onConfirm(hideComments);
        } finally {
            setIsDisabling(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Disable commenting</DialogTitle>
                    <DialogDescription>
                        <strong>{member.name || member.email}</strong> {`won't be able to comment in the future. You can re-enable commenting anytime.`}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex items-center gap-3">
                    <Checkbox
                        checked={hideComments}
                        id="hide-previous-comments"
                        onCheckedChange={checked => setHideComments(checked === true)}
                    />
                    <Label htmlFor="hide-previous-comments">Hide all previous comments</Label>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button disabled={isDisabling} type="button" onClick={handleConfirm}>
                        Disable commenting
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
