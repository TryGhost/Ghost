import BulkActionModals from './components/bulk-action-modals';
import LoadMoreButton from '@components/virtual-table/load-more-button';
import MainLayout from '@components/layout/main-layout';
import PostsContextMenu from './components/posts-context-menu';
import PostsFilters from './components/posts-filters';
import PostsListItem, {getEditorHref} from './components/posts-list-item';
import React, {useEffect, useMemo, useState} from 'react';
import {Button, EmptyIndicator, LoadingIndicator} from '@tryghost/shade/components';
import {ListPage} from '@tryghost/shade/page-templates';
import {LucideIcon} from '@tryghost/shade/utils';
import {PageHeader} from '@tryghost/shade/patterns';
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
import {getPostsListQueries, parsePostsListParams} from './posts-query-params';
import {getSettingValue, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {isAdminUser, isAuthorOrContributor, isOwnerUser} from '@tryghost/admin-x-framework/api/users';
import {useBulkEditPosts, useCopyPost} from '@tryghost/admin-x-framework/api/posts';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';
import {usePostsListData} from './hooks/use-posts-list-data';
import {useSearchParams} from '@tryghost/admin-x-framework';
import type {PendingBulkAction} from './components/bulk-action-modals';
import type {Post} from '@tryghost/admin-x-framework/api/posts';
import type {PostsContextMenuAction} from './components/posts-context-menu';
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

    const loadedPosts = useMemo(() => sections.flatMap(section => section.posts), [sections]);
    const orderedIds = useMemo(() => loadedPosts.map(post => post.id), [loadedPosts]);
    const selectedPosts = useMemo(
        () => loadedPosts.filter(post => isSelected(selection, post.id)),
        [loadedPosts, selection]
    );

    const setParam = (key: 'type' | 'visibility' | 'author' | 'tag' | 'order', value: string | null) => {
        setSearchParams((previous) => {
            const next = new URLSearchParams(previous);
            if (value === null) {
                next.delete(key);
            } else {
                next.set(key, value);
            }
            return next;
        });
        setSelection(clearSelection());
    };

    // Escape clears the selection; cmd/ctrl+A inverts it (select all)
    useEffect(() => {
        if (!selectionEnabled) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setContextMenu(null);
                setSelection(clearSelection());
                return;
            }
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'a' && !isEditableTarget(event.target) && !pendingAction) {
                event.preventDefault();
                setSelection(current => invertSelection(current));
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectionEnabled, pendingAction]);

    const finishBulkAction = () => {
        setSelection(clearSelection());
        void refetchAll();
    };

    const openInEditor = (post: Post) => {
        setSelection(clearSelection());
        window.location.hash = getEditorHref(resource, post.id).slice(1);
    };

    const handleRowContextMenu = (post: Post, event: React.MouseEvent) => {
        if (!selectionEnabled) {
            return;
        }
        event.preventDefault();
        if (!isSelected(selection, post.id)) {
            setSelection(selectOnly(post.id));
        }
        setContextMenu({x: event.clientX, y: event.clientY});
    };

    const handleMenuAction = async (action: PostsContextMenuAction) => {
        setContextMenu(null);

        const filter = selectionFilter(selection, queries.allFilter);
        const count = selectedCount(selection, totalItems);
        const singleTitle = isSingleSelection(selection) ? selectedPosts[0]?.title : undefined;

        switch (action) {
        case 'copy-link':
        case 'copy-preview': {
            const url = selectedPosts[0]?.url;
            if (url) {
                void navigator.clipboard?.writeText(url);
            }
            break;
        }
        case 'feature':
        case 'unfeature':
            await bulkEdit.mutateAsync({action, filter, resource});
            finishBulkAction();
            break;
        case 'duplicate': {
            const id = selectedPosts[0]?.id;
            if (id) {
                await copyPost.mutateAsync({id, resource});
                finishBulkAction();
            }
            break;
        }
        case 'delete':
            setPendingAction({kind: 'delete', filter, count, singleTitle});
            break;
        case 'unpublish':
            setPendingAction({kind: 'unpublish', filter, count, singleTitle});
            break;
        case 'unschedule':
            setPendingAction({kind: 'unschedule', filter, count, singleTitle});
            break;
        case 'add-tag':
            setPendingAction({kind: 'add-tag', filter, count, singleTitle});
            break;
        case 'change-access':
            setPendingAction({kind: 'change-access', filter, count, singleTitle});
            break;
        }
    };

    const isEmpty = !isLoading && !isError && totalItems === 0;
    const hasActiveFilters = params.type !== null || params.visibility !== null || params.author !== null || params.tag !== null;
    const typeLabel = isPages ? 'pages' : 'posts';

    return (
        <MainLayout>
            <ListPage data-testid={`${resource}-page`}>
                <ListPage.Header className="py-4 sidebar:py-5">
                    <PageHeader blurredBackground={false} sticky={false}>
                        <PageHeader.Left>
                            <PageHeader.Title>{isPages ? 'Pages' : 'Posts'}</PageHeader.Title>
                        </PageHeader.Left>
                        <PageHeader.Actions>
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
                    <PostsFilters
                        params={params}
                        resource={resource}
                        restricted={restricted}
                        onParamChange={setParam}
                    />
                </ListPage.Header>
                <ListPage.Body>
                    {isLoading ? (
                        <div className="flex flex-1 items-center justify-center">
                            <LoadingIndicator size="lg" />
                        </div>
                    ) : isError ? (
                        <div className="flex flex-1 flex-col items-center justify-center">
                            <h2 className="mb-2 text-xl font-medium">
                                Error loading {typeLabel}
                            </h2>
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
                                        <Button variant="outline" onClick={() => setSearchParams({})}>
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
                                            post={post}
                                            resource={resource}
                                            selected={selectionEnabled && isSelected(selection, post.id)}
                                            selectionEnabled={selectionEnabled}
                                            onContextMenu={handleRowContextMenu}
                                            onOpen={openInEditor}
                                            onShiftSelect={id => setSelection(current => shiftItem(current, id, orderedIds))}
                                            onToggleSelect={id => setSelection(current => toggleItem(current, id))}
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
        </MainLayout>
    );
};

export default PostsList;
