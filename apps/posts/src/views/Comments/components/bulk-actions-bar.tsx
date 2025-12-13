import React from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    Button,
    LucideIcon
} from '@tryghost/shade';

interface BulkActionsBarProps {
    selectedCount: number;
    totalCount: number;
    onClearSelection: () => void;
    onBulkHide: () => void;
    onBulkShow: () => void;
    onBulkDelete: () => void;
    isSelectingAllMatching: boolean;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
    selectedCount,
    totalCount,
    onClearSelection,
    onBulkHide,
    onBulkShow,
    onBulkDelete,
    isSelectingAllMatching
}) => {
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
    const [showHideDialog, setShowHideDialog] = React.useState(false);

    if (selectedCount === 0) {
        return null;
    }

    return (
        <>
            <div className="sticky bottom-0 z-10 border-t bg-background px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">
                            {selectedCount} {selectedCount === 1 ? 'comment' : 'comments'} selected
                            {isSelectingAllMatching && totalCount > 0 && ' (entire list)'}
                        </span>
                        <Button size="sm" variant="ghost" onClick={onClearSelection}>
                            <LucideIcon.X className="mr-1 h-4 w-4" />
                            Clear
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={onBulkShow}>
                            <LucideIcon.Eye className="mr-1 h-4 w-4" />
                            Show
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowHideDialog(true)}>
                            <LucideIcon.EyeOff className="mr-1 h-4 w-4" />
                            Hide
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                            <LucideIcon.Trash2 className="mr-1 h-4 w-4" />
                            Delete
                        </Button>
                    </div>
                </div>
            </div>

            <AlertDialog open={showHideDialog} onOpenChange={setShowHideDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Hide {selectedCount} {selectedCount === 1 ? 'comment' : 'comments'}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Hidden comments will show as &quot;[Comment removed by moderator]&quot; in threaded comment views.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            onBulkHide();
                            setShowHideDialog(false);
                        }}>
                            Hide comments
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selectedCount} {selectedCount === 1 ? 'comment' : 'comments'}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Deleted comments will be permanently removed and cannot be restored.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
                            onBulkDelete();
                            setShowDeleteDialog(false);
                        }}>
                            Delete comments
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default BulkActionsBar;
