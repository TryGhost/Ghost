import BulkActionModals from './components/bulk-action-modals';
import CustomViewModal from './components/custom-view-modal';
import LoadMoreButton from '@components/virtual-table/load-more-button';
import MainLayout from '@components/layout/main-layout';
import PostsContextMenu from './components/posts-context-menu';
import PostsFilters from './components/posts-filters';
import PostsListItem, {getEditorHref} from './components/posts-list-item';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Button, EmptyIndicator, LoadingIndicator} from '@tryghost/shade/components';
import {ListPage} from '@tryghost/shade/page-templates';
import {LucideIcon} from '@tryghost/shade/utils';
import {PageHeader} from '@tryghost/shade/patterns';
import {PostShareModal} from '@tryghost/shade/posts-stats';
import {apiErrorMessage} from '@utils/api-error-message';
import {
    clearSelection,
    invertSelection,
    isSelected,
    isSingleSelection,
    selectOnly,
    selectedCount,
    selectionFilter,
    shiftItem,
    toggleItem
} from './posts-selection';
import {findMatchingView, paramsToViewFilter} from './posts-views';
import {getPostsListQueries, parsePostsListParams} from './posts-query-params';
import {getSettingValue, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {hasAdminAccess, isAdminUser, isAuthorOrContributor, isOwnerUser} from '@tryghost/admin-x-framework/api/users';
import {toast} from 'sonner';
import {useBulkEditPosts, useCopyPost} from '@tryghost/admin-x-framework/api/posts';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';
import {usePostSuccessModal} from '@hooks/use-post-success-modal';
import {usePostsAnalytics} from './hooks/use-posts-analytics';
import {usePostsListData} from './hooks/use-posts-list-data';
import {usePostsViews} from './hooks/use-posts-views';
import {useSearchParams} from '@tryghost/admin-x-framework';
import type {PendingBulkAction} from './components/bulk-action-modals';
import type {Post} from '@tryghost/admin-x-framework/api/posts';
import type {PostsContextMenuAction} from './components/posts-context-menu';
import type {PostsListAnalyticsContext} from './components/posts-list-item-analytics';
import type {PostsResource, PostsSectionKey} from './posts-query-params';
import type {PostsSelection} from './posts-selection';

const SECTION_LABELS: Record<PostsSectionKey, string> = {
    scheduled: 'Scheduled',
    drafts: 'Drafts',
    published: 'Published'
};

function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }
    return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
}

interface PostsListProps {
    resource?: PostsResource;
}

const PostsList: React.FC<PostsListProps> = ({resource = 'posts'}) => {
    const isPages = resource === 'pages';
    const [searchParams, setSearchParams] = useSearchParams();
    const {data: currentUser} = useCurrentUser();
    const {data: settingsData} = useBrowseSettings({});

    const restricted = !!currentUser && isAuthorOrContributor(currentUser);
    const selectionEnabled = !!currentUser && !restricted;
    const canDelete = !!currentUser && (isOwnerUser(currentUser) || isAdminUser(currentUser));
    const membersEnabled = getSettingValue<string>(settingsData?.settings ?? null, 'members_signup_access') !== 'none';

    const params = useMemo(() => parsePostsListParams(searchParams, resource), [searchParams, resource]);
    const queries = useMemo(() => getPostsListQueries({
        params,
        resource,
        forcedAuthorSlug: restricted ? currentUser?.slug : undefined
    }), [params, resource, restricted, currentUser?.slug]);

    const {sections, isLoading, isError, totalItems, refetchAll} = usePostsListData({
        resource,
        queries,
        enabled: !!currentUser
    });

    const bulkEdit = useBulkEditPosts();
    const copyPost = useCopyPost();

    const [selection, setSelection] = useState<PostsSelection>(clearSelection());
    const [contextMenu, setContextMenu] = useState<{x: number; y: number} | null>(null);
    const [pendingAction, setPendingAction] = useState<PendingBulkAction | null>(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);

    // Publish flow redirect (Ember parity: posts-list/list.js) — shows the
    // share modal for the post that was just published/scheduled
    const {isModalOpen: isSuccessModalOpen, modalProps: successModalProps} = usePostSuccessModal();

    const views = usePostsViews(resource);
    const activeView = useMemo(() => findMatchingView(views, resource, params), [views, resource, params]);

    const loadedPosts = useMemo(() => sections.flatMap(section => section.posts), [sections]);

    const webAnalyticsEnabled = !isPages && getSettingValue<boolean>(settingsData?.settings ?? null, 'web_analytics_enabled') === true;
    const membersTrackSources = !isPages && getSettingValue<boolean>(settingsData?.settings ?? null, 'members_track_sources') === true;
    const emailTrackOpens = getSettingValue<boolean>(settingsData?.settings ?? null, 'email_track_opens') === true;

    const {visitorCounts, memberCounts} = usePostsAnalytics({
        posts: loadedPosts,
        visitorCountsEnabled: webAnalyticsEnabled,
        memberCountsEnabled: membersTrackSources
    });

    const analytics: PostsListAnalyticsContext | undefined = useMemo(() => (isPages ? undefined : {
        webAnalyticsEnabled,
        membersTrackSources,
        emailTrackOpens,
        membersEnabled,
        visitorCounts,
        memberCounts
    }), [isPages, webAnalyticsEnabled, membersTrackSources, emailTrackOpens, membersEnabled, visitorCounts, memberCounts]);
    const orderedIds = useMemo(() => loadedPosts.map(post => post.id), [loadedPosts]);
    const selectedPosts = useMemo(
        () => loadedPosts.filter(post => isSelected(selection, post.id)),
        [loadedPosts, selection]
    );

    const setParam = (key: 'type' | 'visibility' | 'author' | 'tag' | 'order', value: string | null) => {
        // Same-route transitions replace history entries (Ember parity, see
        // TryGhost/Ghost#11057), so Back doesn't step through filter changes
        setSearchParams((previous) => {
            const next = new URLSearchParams(previous);
            if (value === null) {
                next.delete(key);
            } else {
                next.set(key, value);
            }
            return next;
        }, {replace: true});
        setSelection(clearSelection());
    };

    // Escape clears the selection; cmd/ctrl+A inverts it (select all)
    useEffect(() => {
        if (!selectionEnabled) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            const modalOpen = !!pendingAction || viewModalOpen;
            if (event.key === 'Escape') {
                // Leave Escape to the context menu / open modals / editable
                // elements instead of silently dropping the selection
                if (contextMenu || modalOpen || isEditableTarget(event.target)) {
                    return;
                }
                setSelection(clearSelection());
                return;
            }
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a' && !isEditableTarget(event.target) && !modalOpen) {
                event.preventDefault();
                setSelection(current => invertSelection(current));
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectionEnabled, pendingAction, contextMenu, viewModalOpen]);

    const finishBulkAction = () => {
        setSelection(clearSelection());
        // The bulk mutations already invalidate the posts/pages caches; this
        // is belt and braces so the visible sections refresh immediately
        void refetchAll();
    };

    const openInEditor = useCallback((post: Post) => {
        setSelection(clearSelection());
        window.location.hash = getEditorHref(resource, post.id).slice(1);
    }, [resource]);

    const handleRowContextMenu = useCallback((post: Post, event: React.MouseEvent) => {
        if (!selectionEnabled) {
            return;
        }
        event.preventDefault();
        setSelection(current => (isSelected(current, post.id) ? current : selectOnly(post.id)));
        setContextMenu({x: event.clientX, y: event.clientY});
    }, [selectionEnabled]);

    const handleToggleSelect = useCallback((id: string) => {
        setSelection(current => toggleItem(current, id));
    }, []);

    const handleShiftSelect = useCallback((id: string) => {
        setSelection(current => shiftItem(current, id, orderedIds));
    }, [orderedIds]);

    const handleMenuAction = async (action: PostsContextMenuAction) => {
        setContextMenu(null);

        const filter = selectionFilter(selection, queries.allFilter);
        const count = selectedCount(selection, totalItems);
        const isSingle = isSingleSelection(selection);
        const singleTitle = isSingle ? selectedPosts[0]?.title : undefined;
        const singlePost = isSingle ? selectedPosts[0] : undefined;
        const typeWord = (capitalized: boolean) => {
            const word = count === 1 ? (isPages ? 'page' : 'post') : (isPages ? 'pages' : 'posts');
            return capitalized ? word.charAt(0).toUpperCase() + word.slice(1) : word;
        };

        switch (action) {
        case 'copy-link':
        case 'copy-preview': {
            const url = selectedPosts[0]?.url;
            if (url) {
                void navigator.clipboard?.writeText(url);
                toast.success(action === 'copy-link' ? 'Post link copied' : 'Preview link copied');
            }
            break;
        }
        case 'feature':
        case 'unfeature':
            try {
                await bulkEdit.mutateAsync({action, filter, resource});
                toast.success(`${typeWord(true)} ${action === 'feature' ? 'featured' : 'unfeatured'}`);
                finishBulkAction();
            } catch (error) {
                toast.error(apiErrorMessage(error, `Failed to ${action} ${typeWord(false)}`));
            }
            break;
        case 'duplicate': {
            const id = selectedPosts[0]?.id;
            if (id) {
                try {
                    await copyPost.mutateAsync({id, resource});
                    toast.success(`${isPages ? 'Page' : 'Post'} duplicated`);
                    finishBulkAction();
                } catch (error) {
                    toast.error(apiErrorMessage(error, `Failed to duplicate ${isPages ? 'page' : 'post'}`));
                }
            }
            break;
        }
        case 'delete':
            setPendingAction({kind: 'delete', filter, count, singleTitle, singlePost});
            break;
        case 'unpublish':
            setPendingAction({kind: 'unpublish', filter, count, singleTitle, singlePost});
            break;
        case 'unschedule':
            setPendingAction({kind: 'unschedule', filter, count, singleTitle, singlePost});
            break;
        case 'add-tag':
            setPendingAction({kind: 'add-tag', filter, count, singleTitle, singlePost});
            break;
        case 'change-access':
            setPendingAction({kind: 'change-access', filter, count, singleTitle, singlePost});
            break;
        }
    };

    const isEmpty = !isLoading && !isError && totalItems === 0;
    const hasActiveFilters = params.type !== null || params.visibility !== null || params.author !== null || params.tag !== null;
    const typeLabel = isPages ? 'pages' : 'posts';

    // Custom views (Ember parity): the heading shows the matching view's name,
    // and admins can save the current filter state as a view or edit the
    // matching saved (non-default) view
    const headerTitle = activeView?.name ?? (isPages ? 'Pages' : 'Posts');
    const hasViewFilter = hasActiveFilters || params.order !== null;
    const canManageViews = !!currentUser && hasAdminAccess(currentUser);
    const showSaveViewButton = canManageViews && hasViewFilter && !activeView;
    const showEditViewButton = canManageViews && hasViewFilter && !!activeView && !activeView.isDefault;

    return (
        <MainLayout>
            <ListPage data-testid={`${resource}-page`}>
                <ListPage.Header className="py-4 sidebar:py-5">
                    <PageHeader blurredBackground={false} sticky={false}>
                        {/* h-auto keeps the title pinned to the first toolbar row
                            (instead of centering against a wrapped two-row toolbar) */}
                        <PageHeader.Left className="h-auto">
                            {/* h2 so the page title matches the heading level the Ember screen used */}
                            <h2 className="scroll-m-20 text-lg leading-[1.1em] font-semibold tracking-[0.1px] whitespace-nowrap" data-page-header="title">
                                {headerTitle}
                            </h2>
                        </PageHeader.Left>
                        {/* flex-wrap-reverse keeps the New button on the heading
                            row when space runs out — the filters wrap below it,
                            right-aligned, matching Ember's toolbar */}
                        <PageHeader.Actions className="min-w-0 shrink flex-wrap-reverse justify-end gap-2">
                            <PostsFilters
                                params={params}
                                resource={resource}
                                restricted={restricted}
                                onParamChange={setParam}
                            />
                            {showSaveViewButton && (
                                <Button variant="outline" onClick={() => setViewModalOpen(true)}>
                                    <LucideIcon.Plus className="size-4" />
                                    Save as view
                                </Button>
                            )}
                            {showEditViewButton && (
                                <Button variant="outline" onClick={() => setViewModalOpen(true)}>
                                    <LucideIcon.Pencil className="size-4" />
                                    Edit current view
                                </Button>
                            )}
                            <PageHeader.ActionGroup>
                                <Button asChild>
                                    <a className="font-bold" href={getEditorHref(resource)}>
                                        <LucideIcon.Plus className="size-4" />
                                        {isPages ? 'New page' : 'New post'}
                                    </a>
                                </Button>
                            </PageHeader.ActionGroup>
                        </PageHeader.Actions>
                    </PageHeader>
                </ListPage.Header>
                <ListPage.Body>
                    {isLoading ? (
                        <div className="flex flex-1 items-center justify-center">
                            <LoadingIndicator size="lg" />
                        </div>
                    ) : isError ? (
                        <div className="flex flex-1 flex-col items-center justify-center">
                            {/* h3 so the page-title h2 in the header stays unique */}
                            <h3 className="mb-2 text-xl font-medium">
                                Error loading {typeLabel}
                            </h3>
                            <p className="mb-4 text-muted-foreground">
                                Please reload the page to try again
                            </p>
                            <Button onClick={() => window.location.reload()}>
                                Reload page
                            </Button>
                        </div>
                    ) : isEmpty ? (
                        <div className="flex flex-1 items-center justify-center">
                            <EmptyIndicator
                                actions={
                                    hasActiveFilters ? (
                                        <Button variant="outline" onClick={() => setSearchParams({}, {replace: true})}>
                                            Show all {typeLabel}
                                        </Button>
                                    ) : (
                                        <Button asChild>
                                            <a href={getEditorHref(resource)}>
                                                Start writing
                                            </a>
                                        </Button>
                                    )
                                }
                                title={hasActiveFilters ? `No matching ${typeLabel} found.` : `No ${typeLabel} here yet.`}
                            >
                                <LucideIcon.FileText />
                            </EmptyIndicator>
                        </div>
                    ) : (
                        <div className="w-full" data-testid="posts-list">
                            {sections.map(section => section.posts.length > 0 && (
                                <section key={section.key}>
                                    {params.type === null && sections.length > 1 && (
                                        <div className="border-b px-2 pt-6 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                            {SECTION_LABELS[section.key]}
                                        </div>
                                    )}
                                    {section.posts.map(post => (
                                        <PostsListItem
                                            key={post.id}
                                            analytics={analytics}
                                            post={post}
                                            resource={resource}
                                            selected={selectionEnabled && isSelected(selection, post.id)}
                                            selectionEnabled={selectionEnabled}
                                            onContextMenu={handleRowContextMenu}
                                            onOpen={openInEditor}
                                            onShiftSelect={handleShiftSelect}
                                            onToggleSelect={handleToggleSelect}
                                        />
                                    ))}
                                    {section.hasNextPage && (
                                        <LoadMoreButton
                                            isLoading={section.isFetchingNextPage}
                                            onClick={section.fetchNextPage}
                                        />
                                    )}
                                </section>
                            ))}
                        </div>
                    )}
                </ListPage.Body>
            </ListPage>
            {contextMenu && selectionEnabled && (
                <PostsContextMenu
                    canDelete={canDelete}
                    isSingle={isSingleSelection(selection)}
                    membersEnabled={membersEnabled}
                    position={contextMenu}
                    selectedPosts={selectedPosts}
                    onAction={action => void handleMenuAction(action)}
                    onClose={() => setContextMenu(null)}
                />
            )}
            <BulkActionModals
                pending={pendingAction}
                resource={resource}
                onClose={() => setPendingAction(null)}
                onCompleted={finishBulkAction}
            />
            {viewModalOpen && (
                <CustomViewModal
                    activeView={activeView && !activeView.isDefault ? activeView : null}
                    filter={paramsToViewFilter(params)}
                    resource={resource}
                    views={views}
                    onClose={() => setViewModalOpen(false)}
                    onDeleted={() => setSearchParams({}, {replace: true})}
                />
            )}
            {isSuccessModalOpen && successModalProps && (
                <PostShareModal {...successModalProps} />
            )}
        </MainLayout>
    );
};

export default PostsList;
