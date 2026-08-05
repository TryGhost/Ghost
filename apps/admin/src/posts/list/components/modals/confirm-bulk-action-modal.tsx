import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@tryghost/shade/components';
import {getBulkConfirmCopy, type BulkConfirmKey} from '@/posts/list/post-bulk-modal-copy';
import type {PostResource} from '@/posts/list/post-resource';

interface ConfirmBulkActionModalProps {
    action: BulkConfirmKey;
    resource: PostResource;
    /** The selection count — after Cmd+A this is the server total. */
    count: number;
    /** Only used when exactly one post is selected. */
    title?: string;
    /** Ember's `isSingle` — one id selected and not inverted. */
    isSingle?: boolean;
    isRunning: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * The confirmation shared by Delete, Unpublish and Unschedule. All three have
 * the same shape in Ember and differ only in wording, which lives in
 * `post-bulk-modal-copy.ts`.
 *
 * All three are destructive in the sense that matters here: they cannot be
 * undone from the list.
 */
export function ConfirmBulkActionModal({
    action, resource, count, title, isSingle, isRunning, onConfirm, onCancel
}: ConfirmBulkActionModalProps) {
    const copy = getBulkConfirmCopy(action, {count, resource, title, isSingle});

    return (
        <AlertDialog
            open
            onOpenChange={(open) => {
                if (!open) {
                    onCancel();
                }
            }}
        >
            <AlertDialogContent data-testid={`bulk-${action}-modal`}>
                <AlertDialogHeader>
                    <AlertDialogTitle>{copy.title}</AlertDialogTitle>
                    <AlertDialogDescription>{copy.body}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isRunning}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                        disabled={isRunning}
                        // Not `onSelect`: the dialog must stay up while the
                        // request runs, so it closes when the action resolves.
                        onClick={(event) => {
                            event.preventDefault();
                            onConfirm();
                        }}
                    >
                        {isRunning ? copy.runningLabel : copy.confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
