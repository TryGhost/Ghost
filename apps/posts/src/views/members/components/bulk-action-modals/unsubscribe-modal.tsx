import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@tryghost/shade';

interface UnsubscribeModalProps {
    open: boolean;
    memberCount: number;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isLoading?: boolean;
}

export function UnsubscribeModal({
    open,
    memberCount,
    onOpenChange,
    onConfirm,
    isLoading = false
}: UnsubscribeModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="gap-5">
                <DialogHeader>
                    <DialogTitle>Unsubscribe members</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to unsubscribe {memberCount.toLocaleString()} {memberCount === 1 ? 'member' : 'members'} from all newsletters?
                        They will no longer receive any email newsletters from you.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        disabled={isLoading}
                        variant="destructive"
                        onClick={onConfirm}
                    >
                        {isLoading ? 'Unsubscribing...' : 'Unsubscribe'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
