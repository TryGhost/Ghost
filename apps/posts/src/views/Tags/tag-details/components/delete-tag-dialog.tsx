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
import type {Tag} from '@tryghost/admin-x-framework/api/tags';

export function DeleteTagDialog({tag, open: isOpen, onOpenChange, onConfirm}: {
    tag: Tag;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}) {
    const postsCount = tag.count?.posts ?? 0;

    return (
        <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
            <AlertDialogContent data-testid="confirm-delete-tag-modal">
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to delete this tag?</AlertDialogTitle>
                    <AlertDialogDescription>
                        You&rsquo;re about to delete the tag &ldquo;<strong>{tag.name}</strong>&rdquo;.{' '}
                        {postsCount > 0 && (
                            <>
                                It will be removed from{' '}
                                <span data-testid="delete-tag-posts-count">
                                    {postsCount} {postsCount === 1 ? 'post' : 'posts'}
                                </span>.{' '}
                            </>
                        )}
                        This is permanent! We warned you, k?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={onConfirm}
                    >
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
