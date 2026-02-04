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
} from '@tryghost/shade';
import {useState} from 'react';

interface DisableCommentingDialogProps {
    open: boolean;
    memberName?: string | null;
    onOpenChange: (open: boolean) => void;
    onConfirm: (hideComments: boolean) => void;
}

export function DisableCommentingDialog({
    open,
    memberName,
    onOpenChange,
    onConfirm
}: DisableCommentingDialogProps) {
    const [hideComments, setHideComments] = useState(false);

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setHideComments(false);
        }
        onOpenChange(isOpen);
    };

    const handleConfirm = () => {
        onConfirm(hideComments);
        setHideComments(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Disable comments</DialogTitle>
                    <DialogDescription>
                        {memberName || 'This member'} won&apos;t be able to comment
                        in the future. You can re-enable commenting anytime.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center gap-2 py-2">
                    <Checkbox
                        checked={hideComments}
                        id="hide-comments"
                        onCheckedChange={checked => setHideComments(checked === true)}
                    />
                    <Label htmlFor="hide-comments">
                        Hide all previous comments
                    </Label>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm}>
                        Disable comments
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
