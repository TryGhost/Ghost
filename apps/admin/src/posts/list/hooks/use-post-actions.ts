import {getPostActionMessage} from '@/posts/list/post-action-messages';
import {useCopyPage} from '@tryghost/admin-x-framework/api/pages';
import {useCopyPost} from '@tryghost/admin-x-framework/api/posts';
import {useQueryClient} from '@tanstack/react-query';
import {getPostPreviewUrl} from '@/posts/list/post-preview-url';
import {toast} from 'sonner';
import {useCallback} from 'react';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import type {BulkActionSnapshot} from '@/posts/list/hooks/use-post-bulk-actions';
import type {PostContextMenuKey} from '@/posts/list/post-context-menu-items';
import type {PostListItem} from '@/posts/list/hooks/use-posts-list';
import type {PostResource} from '@/posts/list/post-resource';

/**
 * The single-post actions from the right-click menu. The bulk actions and their
 * modals land in Phase 8; this covers the ones that need no confirmation.
 */

/**
 * The keys the menu can actually carry out. Anything absent renders disabled —
 * a menu item that closes the menu and does nothing is worse than one that says
 * it isn't ready.
 */
export const IMPLEMENTED_POST_ACTIONS: ReadonlySet<PostContextMenuKey> = new Set([
    'copy-link',
    'copy-preview',
    'duplicate',
    'gift-link',
    'delete',
    'unpublish',
    'unschedule',
    'feature',
    'unfeature',
    'add-tag',
    'change-access'
]);

interface UsePostActionsOptions {
    resource: PostResource;
    /** The selected posts that are loaded — Ember's `availableModels`. */
    posts: PostListItem[];
    /** The screen owns the modal; the hook just says which post to open it for. */
    onShareAsGift?: (postId: string) => void;
    /**
     * How many posts the action applies to — the *selection* count, which after
     * Cmd+A is the server total rather than the rows in memory. Ember
     * interpolates the same number into its toasts.
     */
    count: number;
    /** Bulk keys are handed upward with the selection captured at this moment. */
    onBulkAction?: (key: PostContextMenuKey, snapshot: BulkActionSnapshot) => void;
    /** The NQL filter describing the selection, possibly inverted. */
    selectionFilter: string;
    /** The bucket filters currently on screen — see `BulkActionSnapshot`. */
    bucketFilters: string[];
    /** Ember's `isSingle`, captured with the rest of the selection. */
    isSingle: boolean;
    /** Whether the selection is inverted (Cmd+A) — see `BulkActionSnapshot`. */
    inverted: boolean;
}

export function usePostActions({
    resource, posts, onShareAsGift, count, onBulkAction, selectionFilter, bucketFilters, isSingle, inverted
}: UsePostActionsOptions) {
    const {data: siteData} = useBrowseSite();
    const siteUrl = siteData?.site.url ?? '';

    // Both are called unconditionally and picked by resource — hooks can't be
    // called behind a branch.
    const copyPost = useCopyPost();
    const copyPage = useCopyPage();
    const queryClient = useQueryClient();

    return useCallback(async (key: PostContextMenuKey) => {
        const first = posts[0];

        if (!first) {
            return;
        }

        const notify = (message: Parameters<typeof getPostActionMessage>[0]) => {
            toast.success(getPostActionMessage(message, {count, resource, isSingle}));
        };

        // Ember wraps every one of these in a try/catch and surfaces the error;
        // without it a failed copy or a clipboard the browser refuses to write
        // to (it rejects when the document isn't focused) is completely silent
        // — no toast, no change, nothing to retry.
        try {
        switch (key) {
        case 'copy-link':
            await navigator.clipboard.writeText(first.url);
            notify('copiedPostUrl');
            break;
        case 'copy-preview':
            // The preview URL, not `first.url`. Ember copies the latter here,
            // which for a draft is a permalink to a page that does not exist
            // yet — and is the identical string its "Copy link to post" action
            // produces, making the two menu items indistinguishable.
            await navigator.clipboard.writeText(getPostPreviewUrl(first, siteUrl));
            notify('copiedPreviewUrl');
            break;
        case 'duplicate': {
            if (resource === 'pages') {
                await copyPage.mutateAsync(first.id);
            } else {
                await copyPost.mutateAsync(first.id);
            }

            // Ember unshifts the copy straight into its draft bucket. We
            // refetch instead: a duplicate is always a draft whatever the
            // source was, so it belongs in a different bucket from the row it
            // came from, and the buckets are separate queries here. One list
            // refetch is cheap, and unlike the bulk actions in Phase 8 there is
            // no long selection whose scroll position needs preserving.
            const dataType = resource === 'pages' ? 'PagesResponseType' : 'PostsResponseType';

            // Not awaited: `invalidateQueries` settles only once every active
            // query has refetched, and nothing here depends on that having
            // finished.
            void queryClient.invalidateQueries({queryKey: [dataType]});

            notify('duplicated');
            break;
        }
        case 'gift-link':
            onShareAsGift?.(first.id);
            break;
        default:
            // Everything else is a bulk action. The selection is captured now,
            // because the menu is about to close and take a transient selection
            // with it.
            onBulkAction?.(key, {filter: selectionFilter, posts, count, bucketFilters, isSingle, inverted});
            break;
        }
        } catch (error) {
            toast.error(error instanceof Error && error.message
                ? error.message
                : `Could not complete that action on this ${resource === 'pages' ? 'page' : 'post'}.`);
        }
    }, [
        posts, resource, siteUrl, copyPost, copyPage, queryClient,
        onShareAsGift, count, onBulkAction, selectionFilter, bucketFilters, isSingle, inverted
    ]);
}
