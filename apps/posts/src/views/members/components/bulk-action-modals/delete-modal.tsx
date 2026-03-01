import {
    Button,
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@tryghost/shade';
import {useState} from 'react';

interface DeleteModalProps {
    open: boolean;
    memberCount: number;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    onExportBackup: () => void;
    isLoading?: boolean;
}

export function DeleteModal({
    open,
    memberCount,
    onOpenChange,
    onConfirm,
    onExportBackup,
    isLoading = false
}: DeleteModalProps) {
    const [isPreparingBackup, setIsPreparingBackup] = useState(false);

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setIsPreparingBackup(false);
        }
        onOpenChange(isOpen);
    };

    const handleConfirm = async () => {
        if (memberCount < 1 || isLoading || isPreparingBackup) {
            return;
        }

        try {
            setIsPreparingBackup(true);
            await onExportBackup();
            onConfirm();
        } catch {
            // Error handling/toasts are managed by the parent callbacks.
        } finally {
            setIsPreparingBackup(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="gap-5">
                <DialogHeader>
                    <DialogTitle>Delete selected members?</DialogTitle>
                </DialogHeader>

                <div className="text-sm">
                    {memberCount > 0 ? (
                        <>
                            <p>
                                You&apos;re about to delete <strong>{memberCount.toLocaleString()} {memberCount === 1 ? 'member' : 'members'}</strong>.
                                This is permanent! All Ghost data will be deleted, this will have no effect on subscriptions in Stripe.
                            </p>
                            <p className="mt-4">
                                A backup of your selection will be automatically downloaded to your device before deletion.
                            </p>
                        </>
                    ) : (
                        <p>No members are selected.</p>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        disabled={isLoading || isPreparingBackup || memberCount < 1}
                        variant="destructive"
                        onClick={handleConfirm}
                    >
                        {isLoading || isPreparingBackup ? 'Deleting...' : 'Download backup & delete members'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
