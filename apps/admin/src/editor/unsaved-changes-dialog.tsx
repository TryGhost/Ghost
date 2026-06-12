import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@tryghost/shade/components";

// Local equivalent of apps/posts/src/components/unsaved-changes (not exported
// from the posts package), matching its copy and testids.
export function UnsavedChangesDialog({ open, onStay, onLeave }: {
    open: boolean;
    onStay: () => void;
    onLeave: () => void;
}) {
    return (
        <AlertDialog open={open}>
            <AlertDialogContent data-testid="unsaved-changes-modal">
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to leave this page?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Hey there! It looks like you didn&rsquo;t save the changes you made. Save before you go!
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onStay}>Stay</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={onLeave}
                    >
                        Leave
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
