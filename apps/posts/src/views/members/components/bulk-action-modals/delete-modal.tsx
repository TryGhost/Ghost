import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    LucideIcon
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
    const [backupExported, setBackupExported] = useState(false);

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setBackupExported(false);
        }
        onOpenChange(isOpen);
    };

    const handleExportBackup = () => {
        onExportBackup();
        setBackupExported(true);
    };

    const handleConfirm = () => {
        onConfirm();
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="gap-5">
                <DialogHeader>
                    <DialogTitle>Delete members</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete {memberCount.toLocaleString()} {memberCount === 1 ? 'member' : 'members'}?
                        This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>

                <div className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950 rounded-md border p-4">
                    <div className="flex items-start gap-3">
                        <LucideIcon.AlertTriangle className="text-amber-600 dark:text-amber-500 mt-0.5 size-5 shrink-0" />
                        <div className="space-y-2">
                            <p className="text-amber-800 dark:text-amber-200 text-sm font-medium">
                                Export a backup before deleting
                            </p>
                            <p className="text-amber-700 dark:text-amber-300 text-sm">
                                We recommend exporting a backup of these members before deleting them.
                                You can use this backup to restore them if needed.
                            </p>
                            <Button
                                className="mt-2"
                                disabled={backupExported}
                                size="sm"
                                variant="outline"
                                onClick={handleExportBackup}
                            >
                                {backupExported ? (
                                    <>
                                        <LucideIcon.Check className="mr-2 size-4" />
                                        Backup exported
                                    </>
                                ) : (
                                    <>
                                        <LucideIcon.Download className="mr-2 size-4" />
                                        Export backup
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        disabled={isLoading}
                        variant="destructive"
                        onClick={handleConfirm}
                    >
                        {isLoading ? 'Deleting...' : `Delete ${memberCount.toLocaleString()} ${memberCount === 1 ? 'member' : 'members'}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
