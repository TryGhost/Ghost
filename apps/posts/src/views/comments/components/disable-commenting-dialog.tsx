import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@tryghost/shade';

interface DisableCommentingDialogProps {
    open: boolean;
    memberName?: string | null;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}

export function DisableCommentingDialog({
    open,
    memberName,
    onOpenChange,
    onConfirm
}: DisableCommentingDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Disable comments</DialogTitle>
                    <DialogDescription>
                        {memberName || 'This member'} won&apos;t be able to comment
                        in the future. You can re-enable commenting anytime.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={onConfirm}>
                        Disable comments
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
