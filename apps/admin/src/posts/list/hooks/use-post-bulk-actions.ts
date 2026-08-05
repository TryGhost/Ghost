import {getPostActionMessage, type PostActionMessageKey} from '@/posts/list/post-action-messages';
import {pruneNonMatchingPosts} from '@/posts/list/prune-non-matching-posts';
import {toast} from 'sonner';
import {useCallback, useState} from 'react';
import {useBulkDeletePages, useBulkEditPages} from '@tryghost/admin-x-framework/api/pages';
import {useBulkDeletePosts, useBulkEditPosts} from '@tryghost/admin-x-framework/api/posts';
import {useQueryClient} from '@tanstack/react-query';
import type {PostBulkAction} from '@tryghost/admin-x-framework/api/posts';
import type {PostContextMenuKey} from '@/posts/list/post-context-menu-items';
import type {PostListItem} from '@/posts/list/hooks/use-posts-list';
import type {PostResource} from '@/posts/list/post-resource';

/**
 * The bulk actions reachable from the right-click menu.
 *
 * Two things make this more than a mutation call.
 *
 * **The selection is snapshotted when the action starts.** Radix closes the
 * menu the moment an item is chosen, which clears a transient selection — so a
 * confirmation modal that read the live selection would find it empty by the
 * time the user pressed Delete. Ember solves this by freezing the selection
 * list for the whole modal lifetime; taking a copy up front is the same
 * guarantee with none of the state machine.
 *
 * **Edited rows are pruned client-side, not refetched.** That is what makes
 * unfeaturing a post while viewing `?type=featured` remove it immediately
 * without losing scroll position. See `prune-non-matching-posts.ts`.
 */

export interface BulkActionSnapshot {
    /** The NQL filter describing the selection — possibly inverted. */
    filter: string;
    /** The selected posts that are loaded, for pruning and for the modal title. */
    posts: PostListItem[];
    /** The selection count, which after Cmd+A is the server total. */
    count: number;
    /** The list's own filter, which pruned rows must still match. */
    allFilter: string;
    /**
     * The bucket filters the screen is currently showing. Ember iterates only
     * the three infinity models on screen; `setQueriesData` would otherwise
     * reach every cached list for the resource — including a Featured list
     * cached from an earlier visit — and prune it against the *current*
     * screen's filter, which is not its own.
     */
    bucketFilters: string[];
}

/**
 * Maps a menu item to the server's bulk action and its toast.
 *
 * Feature and unfeature have no message: Ember shows no notification for
 * either, because the star appearing or disappearing on the row is the
 * feedback. Both are also unconfirmed — they apply straight away.
 */
const BULK_ACTIONS: Partial<Record<PostContextMenuKey, {
    action: PostBulkAction['type'];
    message?: PostActionMessageKey;
}>> = {
    unpublish: {action: 'unpublish', message: 'unpublished'},
    unschedule: {action: 'unschedule', message: 'unscheduled'},
    feature: {action: 'feature'},
    unfeature: {action: 'unfeature'}
};

/**
 * How each action changes a row locally, so the pruner decides against the
 * post's *new* state. Ember pushes the same fields into its store for the same
 * reason — without it, unpublishing while viewing `?type=published` would leave
 * the rows in place until a refetch.
 */
function applyLocalEdit(post: PostListItem, key: PostContextMenuKey): PostListItem {
    switch (key) {
    case 'unpublish':
        return post.status === 'published' ? {...post, status: 'draft'} : post;
    case 'unschedule':
        return post.status === 'scheduled'
            ? {...post, status: 'draft', published_at: undefined}
            : post;
    case 'feature':
        return {...post, featured: true};
    case 'unfeature':
        return {...post, featured: false};
    default:
        return post;
    }
}

function decodeQueryKey(queryKey: readonly unknown[]): string {
    const raw = JSON.stringify(queryKey);

    try {
        return decodeURIComponent(raw);
    } catch {
        // A malformed escape would throw; matching nothing is safer than
        // patching a list this action is not about.
        return raw;
    }
}

interface UsePostBulkActionsOptions {
    resource: PostResource;
    /**
     * Called after a delete. Ember force-clears the whole selection here,
     * because every selected row is gone.
     */
    onDeleted?: () => void;
    /**
     * Called after an edit, with the ids still present in the list. Ember calls
     * `clearUnavailableItems` — it keeps the selection on the rows that are
     * still visible, so a second action can follow the first.
     */
    onEdited?: (remainingIds: Set<string>) => void;
}

export function usePostBulkActions({resource, onDeleted, onEdited}: UsePostBulkActionsOptions) {
    const [isRunning, setIsRunning] = useState(false);
    const queryClient = useQueryClient();

    // Called unconditionally and picked by resource — hooks can't be branched.
    const bulkEditPosts = useBulkEditPosts();
    const bulkEditPages = useBulkEditPages();
    const bulkDeletePosts = useBulkDeletePosts();
    const bulkDeletePages = useBulkDeletePages();

    const isPages = resource === 'pages';
    const dataType = isPages ? 'PagesResponseType' : 'PostsResponseType';

    /**
     * Removes the given ids from every cached page of the list, and prunes any
     * edited row that no longer matches the list's filter. Patching rather than
     * refetching is what preserves scroll position on a long list.
     */
    const patchCaches = useCallback((
        snapshot: BulkActionSnapshot,
        action: PostContextMenuKey
    ): Set<string> => {
        const editedIds = new Set(snapshot.posts.map(post => post.id));
        const isDelete = action === 'delete';
        const remaining = new Set<string>();

        queryClient.setQueriesData<{pages?: {posts?: PostListItem[]; pages?: PostListItem[]}[]}>(
            {
                queryKey: [dataType],
                // Only the lists on screen. A cached list from another filter
                // must not be pruned against this one.
                //
                // The key is `[dataType, url]` with the filter percent-encoded
                // into the query string, so it has to be decoded before the
                // raw bucket filter can be found in it.
                predicate: query => snapshot.bucketFilters.some(
                    filter => decodeQueryKey(query.queryKey).includes(filter)
                )
            },
            (cached) => {
                if (!cached?.pages) {
                    return cached;
                }

                return {
                    ...cached,
                    pages: cached.pages.map((page) => {
                        const key = isPages ? 'pages' : 'posts';
                        const rows = page[key] ?? [];

                        if (isDelete) {
                            return {...page, [key]: rows.filter(row => !editedIds.has(row.id))};
                        }

                        // The edit is applied to the cached rows *first*, so
                        // the pruner sees the post as it now is. Applying it to
                        // the snapshot's copies instead would leave the cache
                        // holding the old state and prune nothing.
                        const edited = rows.map(row => (
                            editedIds.has(row.id) ? applyLocalEdit(row, action) : row
                        ));

                        const kept = pruneNonMatchingPosts({
                            posts: edited,
                            editedIds,
                            filter: snapshot.allFilter
                        });

                        kept.forEach((row) => {
                            if (editedIds.has(row.id)) {
                                remaining.add(row.id);
                            }
                        });

                        return {...page, [key]: kept};
                    })
                };
            }
        );

        return remaining;
    }, [queryClient, dataType, isPages]);

    const run = useCallback(async (key: PostContextMenuKey, snapshot: BulkActionSnapshot) => {
        setIsRunning(true);

        try {
            if (key === 'delete') {
                if (isPages) {
                    await bulkDeletePages.mutateAsync({filter: snapshot.filter});
                } else {
                    await bulkDeletePosts.mutateAsync({filter: snapshot.filter});
                }

                patchCaches(snapshot, 'delete');
                toast.success(getPostActionMessage('deleted', {count: snapshot.count, resource}));
                onDeleted?.();

                return;
            }

            const bulk = BULK_ACTIONS[key];

            if (!bulk) {
                return;
            }

            const payload = {filter: snapshot.filter, action: {type: bulk.action} as PostBulkAction};

            if (isPages) {
                await bulkEditPages.mutateAsync(payload);
            } else {
                await bulkEditPosts.mutateAsync(payload);
            }

            if (bulk.message) {
                toast.success(getPostActionMessage(bulk.message, {count: snapshot.count, resource}));
            }

            const remaining = patchCaches(snapshot, key);

            // The rows the edit pushed out of the list are no longer selectable,
            // but the ones still on screen stay selected — matching Ember's
            // `clearUnavailableItems` rather than a full clear.
            onEdited?.(remaining);
        } catch (error) {
            // Without this the rejection is unhandled and the user sees
            // nothing: the modal simply sits there. Ember surfaces the API
            // error through `showAPIError`.
            toast.error(error instanceof Error && error.message
                ? error.message
                : 'That action could not be completed.');
        } finally {
            setIsRunning(false);
        }
    }, [
        isPages, resource, onDeleted, onEdited, patchCaches,
        bulkEditPosts, bulkEditPages, bulkDeletePosts, bulkDeletePages
    ]);

    return {run, isRunning};
}
