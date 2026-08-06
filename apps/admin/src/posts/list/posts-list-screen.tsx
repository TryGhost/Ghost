import {Box, Container, Stack, Text} from '@tryghost/shade/primitives';
import {Button, LoadingIndicator} from '@tryghost/shade/components';
import {ListPage} from '@tryghost/shade/page-templates';
import {LoadMoreButton} from '@/shared/virtual-list';
import {cn, LucideIcon} from '@tryghost/shade/utils';
import {FilterBar, PageHeader} from '@tryghost/shade/patterns';
import {PostListRow} from './components/post-list-row';
import {PostsEmptyState} from './components/posts-empty-state';
import {PostsFilters} from './components/posts-filters';
import {ManagePostViewPopover} from './components/manage-post-view-popover';
import {POST_DEFAULT_VIEWS} from '@/layout/app-sidebar/post-sidebar-views';
import {PostsSortMenu} from './components/posts-sort-menu';
import {buildAllFilter, buildBucketFilter, getActiveBuckets} from './post-query-params';
import {canSavePostView, findActivePostView} from './post-views';

import {usePostViews} from './hooks/use-post-views';
import {getSettingValue, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {hasAdminAccess, isAuthorOrContributor, isContributorUser} from '@tryghost/admin-x-framework/api/users';
import {usePostActions} from './hooks/use-post-actions';
import {usePostSelection} from './hooks/use-post-selection';
import {canCopyGiftLink} from '@/shared/gift-link';
import {PostCelebrationModal} from './components/post-celebration-modal';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {usePostPublishCelebration} from './hooks/use-post-publish-celebration';
import {AddTagModal} from './components/modals/add-tag-modal';
import {ChangeAccessModal} from './components/modals/change-access-modal';
import {ConfirmBulkActionModal} from './components/modals/confirm-bulk-action-modal';
import {usePostBulkActions, type BulkActionSnapshot} from './hooks/use-post-bulk-actions';
import type {BulkConfirmKey} from './post-bulk-modal-copy';
import type {PostContextMenuKey} from './post-context-menu-items';
import {getPostContextMenuItems} from './post-context-menu-items';
import {getPostSelectionCount, isPostSelected, isSinglePostSelected} from './post-selection-state';
import {type PostResource, getPostResourceCopy} from './post-resource';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';
import {usePostsFilterState} from './hooks/use-posts-filter-state';
import {rememberStickyPostFilters} from './posts-sticky-filters';
import {lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useLocation} from '@tryghost/admin-x-framework';
import {usePostAnalyticsCounts} from './hooks/use-post-analytics-counts';
import {usePostsList} from './hooks/use-posts-list';

/**
 * The React posts and pages list screens, served behind the `postsListReact`
 * Labs flag. One implementation, two resources — see `post-resource.ts`.
 *
 * Currently renders bare titles: this phase is about the data layer being
 * right (three sequenced queries, URL round-tripping), not the design.
 */
/** The three that ask before acting. Feature and unfeature do not. */
const CONFIRMABLE_ACTIONS: PostContextMenuKey[] = ['delete', 'unpublish', 'unschedule'];

// Only needed once someone opens it, and it pulls in the gift-link API layer.
const GiftLinkModal = lazy(() => import('@/posts/analytics/modals/gift-link-modal'));

export function PostsListScreen({resource}: {resource: PostResource}) {
    const copy = getPostResourceCopy(resource);
    const {params, filters, order, setFilters, setOrder, hasFilters, clearFilters} = usePostsFilterState();
    const {data: currentUser} = useCurrentUser();
    const {data: settingsData} = useBrowseSettings();

    // Report the current filters so the sidebar's Posts link can return here.
    const location = useLocation();

    useEffect(() => {
        rememberStickyPostFilters(resource, location.search);
    }, [resource, location.search]);

    // Scheduled times read in the site's timezone, not the browser's.
    const timezone = getSettingValue<string>(settingsData?.settings, 'timezone') ?? undefined;
    const isContributor = Boolean(currentUser && isContributorUser(currentUser));
    // Ember's `isAdmin` — Owner or Administrator. Decides whether a row's
    // trailing button offers Analytics, and whether views can be saved.
    const isAdmin = Boolean(currentUser && hasAdminAccess(currentUser));

    const settings = settingsData?.settings ?? null;
    // Memoised because it is a prop of every row, and the rows are memoised:
    // rebuilding this object each render would defeat that and re-render the
    // whole list on every modifier keypress.
    const metricsSettings = useMemo(() => ({
        webAnalyticsEnabled: getSettingValue<boolean>(settings, 'web_analytics_enabled') === true,
        membersTrackSources: getSettingValue<boolean>(settings, 'members_track_sources') === true,
        emailTrackOpens: getSettingValue<boolean>(settings, 'email_track_opens') === true,
        emailTrackClicks: getSettingValue<boolean>(settings, 'email_track_clicks') === true,
        membersSignupAccess: getSettingValue<string>(settings, 'members_signup_access') ?? 'all',
        isMembersInviteOnly: getSettingValue<string>(settings, 'members_signup_access') === 'invite',
        isContributor
    }), [settings, isContributor]);
    const paidMembersEnabled = getSettingValue<boolean>(settings, 'paid_members_enabled') === true;

    // The save/edit-view affordance: admins only, posts only, not while a
    // default view is active, and only with something actually filtered.
    const savedViews = usePostViews();
    // Posts only: the saved views are posts views, and matching is filter-only,
    // so on /pages this could otherwise resolve to a posts view.
    const activeView = resource === 'posts' ? findActivePostView(savedViews, params) : undefined;
    const isOnDefaultView = POST_DEFAULT_VIEWS.some(view => findActivePostView([{
        ...view, route: 'posts'
    }], params));
    const canManageView = canSavePostView({
        isAdmin,
        resource,
        params,
        isDefaultView: isOnDefaultView
    });

    // The bar is for chips, and appears only when there are some — a sort is
    // not a filter and should not open a row of its own.
    //
    // Save-view sits with the chips it relates to, at the right of that bar.
    // But it answers to `canManageView`, which includes `order` — so a sort on
    // its own makes the view saveable with no chips and no bar to hold the
    // button. It falls back to the top row there, rather than the capability
    // disappearing whenever the bar does.
    const showFilterBar = hasFilters;
    const showViewActionsInHeader = canManageView && !showFilterBar;

    // Authors and contributors only ever see their own posts, whatever the
    // `author` param says — matching PostsRoute#model in the Ember app.
    const isRestrictedAuthor = Boolean(currentUser && isAuthorOrContributor(currentUser));
    const ownAuthorSlug = currentUser && isRestrictedAuthor ? currentUser.slug : null;

    const {
        items,
        isLoading,
        isError,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
        totalItems
    } = usePostsList({resource, params, context: {ownAuthorSlug}});

    // Selection is a bulk-edit affordance, and authors and contributors have no
    // bulk actions — Ember disables the whole SelectionList for them.
    const selection = usePostSelection({
        orderedIds: items.map(item => item.id),
        // Bounds an inverted selection: after Cmd+A a bulk action sends this
        // filter rather than every id, so it covers rows never loaded.
        allFilter: buildAllFilter(params, {ownAuthorSlug}),
        enabled: Boolean(currentUser) && !isRestrictedAuthor
    });

    // The menu describes the selection, not the row under the cursor. Ember's
    // `availableModels` — the selected rows that are actually loaded.
    //
    // Depends on `selection.state` rather than `selection`, which is a fresh
    // object literal every render and would make this memo a no-op.
    // The buckets on screen, so a bulk edit only patches the lists it is about.
    const bucketFilters = useMemo(
        () => getActiveBuckets(params).map(bucket => buildBucketFilter(bucket, params, {ownAuthorSlug})),
        [params, ownAuthorSlug]
    );

    const selectionState = selection.state;
    const menuPosts = useMemo(
        () => items.filter(item => isPostSelected(selectionState, item.id)),
        [items, selectionState]
    );
    const membersEnabled = getSettingValue<string>(settings, 'members_signup_access') !== 'none';

    // Identical for every row, so computed once rather than per row per render.
    /**
     * Both of these change on every selection change — the items because they
     * describe the selection, the action because it closes over it. Handing
     * either to 100 memoised rows by value re-renders the whole list on every
     * click. Behind a ref the rows keep their memo and read current values when
     * a menu actually opens.
     */
    const menuItems = useMemo(() => getPostContextMenuItems({
        posts: menuPosts,
        resource,
        isAdmin,
        membersEnabled,
        // The gift link is filtered back in per row below, since it is the one
        // item that depends on *which* post rather than on the selection.
        canCopyGiftLink: true
    }), [menuPosts, resource, isAdmin, membersEnabled]);

    // Ember gates this on `isSingle` — one *selected* post — not on "one loaded
    // post". After Cmd+A on a view with a single loaded row, everything is
    // selected, and offering to gift-link it would be wrong.
    const giftLinkPost = isSinglePostSelected(selectionState) ? menuPosts[0] : undefined;
    const menuGiftLinkPostId = giftLinkPost && canCopyGiftLink({user: currentUser, post: giftLinkPost})
        ? giftLinkPost.id
        : null;
    // Opened from the context menu. Ember reaches the same React modal over the
    // state bridge; here the list owns it directly, so there is one modal and
    // one set of eligibility rules behind both implementations.
    const [giftLinkPostId, setGiftLinkPostId] = useState<string | null>(null);

    // The Ember editor writes a localStorage key on publish and navigates here;
    // this reads it. The editor stays Ember on both sides of the flag.
    const celebration = usePostPublishCelebration();
    const {data: siteData} = useBrowseSite();

    /**
     * A bulk action that has been chosen but not yet confirmed. The selection
     * is captured *here*, when the menu item is picked — Radix closes the menu
     * straight away, which clears a transient selection, so a modal reading the
     * live selection would find it empty. Ember freezes its selection list for
     * the modal's lifetime; a snapshot is the same guarantee without the state
     * machine.
     */
    const [pendingBulkAction, setPendingBulkAction] = useState<
        {key: PostContextMenuKey; snapshot: BulkActionSnapshot} | null
    >(null);

    const bulkActions = usePostBulkActions({
        resource,
        onDeleted: () => {
            setPendingBulkAction(null);
            selection.clear();
        },
        onEdited: (remainingIds) => {
            setPendingBulkAction(null);
            // Not a full clear: the rows still on screen stay selected, so a
            // second action can follow the first. Ember's clearUnavailableItems.
            selection.keepOnly(remainingIds);
        }
    });
    const menuItemsRef = useRef(menuItems);
    const runPostActionRef = useRef<(key: PostContextMenuKey) => void | Promise<void>>(() => {});

    menuItemsRef.current = menuItems;

    const getMenuItems = useCallback(() => menuItemsRef.current, []);
    const stableRunPostAction = useCallback(
        (key: PostContextMenuKey) => runPostActionRef.current(key),
        []
    );

    const runPostAction = usePostActions({
        resource,
        posts: menuPosts,
        onShareAsGift: setGiftLinkPostId,
        onBulkAction: (key, snapshot) => {
            // Feature and unfeature apply straight away in Ember — no
            // confirmation, because they are trivially reversible.
            if (key === 'feature' || key === 'unfeature') {
                void bulkActions.run(key, snapshot);
                return;
            }

            setPendingBulkAction({key, snapshot});
        },
        selectionFilter: selection.filter,
        bucketFilters,
        isSingle: isSinglePostSelected(selectionState),
        // The selection count, not the loaded-row count: after Cmd+A on a
        // 2,000-post site the toast has to say 2,000, not the 30 in memory.
        count: getPostSelectionCount(selectionState, totalItems)
    });

    runPostActionRef.current = runPostAction;

    const {visitorCounts, memberCounts} = usePostAnalyticsCounts({
        items,
        webAnalyticsEnabled: metricsSettings.webAnalyticsEnabled,
        membersTrackSources: metricsSettings.membersTrackSources
    });

    return (
        <Box className='size-full'>
            <Container className='relative flex h-full flex-col' size='page'>
                <ListPage data-testid={`${resource}-page`}>
                    <ListPage.Header>
                        <PageHeader blurredBackground={false} sticky={false}>
                            <PageHeader.Left>
                                <PageHeader.Title>{copy.title}</PageHeader.Title>
                            </PageHeader.Left>
                            {/* Sort and the primary button live in the top row,
                                as on the members list. The filter trigger joins
                                them only while there is nothing to show — once
                                there is, it moves down into a full-width row,
                                because chips need the width and would otherwise
                                crowd the title. */}
                            <PageHeader.Actions>
                                <PageHeader.ActionGroup>
                                    {!showFilterBar && (
                                        <PostsFilters
                                            currentUser={currentUser}
                                            filters={filters}
                                            iconOnly={true}
                                            params={params}
                                            resource={resource}
                                            onFiltersChange={setFilters}
                                        />
                                    )}
                                    <PostsSortMenu order={order} onOrderChange={setOrder} />
                                    {showViewActionsInHeader && (
                                        <ManagePostViewPopover activeView={activeView} params={params} resource={resource} />
                                    )}
                                    <Button asChild>
                                        <a className='font-bold' href={copy.newHref}>
                                            <LucideIcon.Plus className='size-4' />
                                            <span className='hidden sm:inline'>{copy.newLabel}</span>
                                        </a>
                                    </Button>
                                </PageHeader.ActionGroup>
                            </PageHeader.Actions>
                        </PageHeader>
                        {showFilterBar && (
                            <FilterBar>
                                <PostsFilters
                                    currentUser={currentUser}
                                    filters={filters}
                                    params={params}
                                    resource={resource}
                                    viewActions={canManageView && (
                                        <ManagePostViewPopover activeView={activeView} params={params} resource={resource} />
                                    )}
                                    onFiltersChange={setFilters}
                                />
                            </FilterBar>
                        )}
                    </ListPage.Header>
                    <ListPage.Body>
                        {isLoading ? (
                            <Stack align='center' className='flex-1' justify='center'>
                                <LoadingIndicator size='lg' />
                            </Stack>
                        ) : isError ? (
                            <Stack align='center' className='flex-1' justify='center'>
                                <Text tone='secondary'>Error loading {copy.title.toLowerCase()}</Text>
                            </Stack>
                        ) : items.length === 0 ? (
                            <Stack align='center' className='flex-1' justify='center'>
                                <PostsEmptyState
                                    hasFilters={hasFilters}
                                    resource={resource}
                                    onClearFilters={clearFilters}
                                />
                            </Stack>
                        ) : (
                            // Deliberately the same testids the Ember list
                            // uses — including on pages, which shares the
                            // Ember component — so the e2e page objects can
                            // eventually target both implementations. They can
                            // never collide: the Ember route aborts when this
                            // screen renders.
                            //
                            // Ember renders `posts-list` even when empty, and
                            // its rows are still richer than these; Phase 10
                            // reconciles the page object and re-baselines the
                            // visual-regression shots.
                            <Stack gap='md'>
                                <ul
                                    // While a modifier is held the list stops
                                    // behaving like a list of links: no pointer
                                    // cursor, and children take no pointer
                                    // events, so a click lands on the row
                                    // rather than the anchor inside it. That is
                                    // how Ember's `[data-ctrl]` rules work, and
                                    // it makes select mode visible before the
                                    // click. Anything opted out of selection
                                    // stays clickable.
                                    // The separator opening the list, rather
                                    // than one closing the header: the header
                                    // is full-bleed (it bleeds out through
                                    // negative margins so its blur reaches the
                                    // viewport edge), so a border there runs
                                    // wider than the rows it is meant to sit
                                    // against. On the list it lines up with the
                                    // row dividers exactly.
                                    className={cn('border-t border-border-default', selection.modifierHeld && [
                                        'cursor-default',
                                        '[&_li_*]:pointer-events-none [&_li_*]:cursor-default',
                                        '[&_li_[data-ignore-select]]:pointer-events-auto',
                                        '[&_li_[data-ignore-select]]:cursor-pointer'
                                    ])}
                                    data-ctrl={selection.modifierHeld ? 'true' : undefined}
                                    // Observable so tests can tell "all four
                                    // rows selected" from "inverted", which
                                    // look identical on a loaded page but mean
                                    // very different things to a bulk action.
                                    data-selection={selection.state.inverted ? 'inverted' : undefined}
                                    data-testid='posts-list'
                                >
                                    {items.map(item => (
                                        <PostListRow
                                            key={item.id}
                                            getMenuItems={getMenuItems}
                                            hasAdminAccess={isAdmin}
                                            isContributor={isContributor}
                                            isSelected={selection.isSelected(item.id)}
                                            memberCounts={memberCounts}
                                            menuEnabled={selection.enabled}
                                            menuOnAction={stableRunPostAction}
                                            menuOnOpenChange={selection.getContextMenuOpenHandler(item.id)}
                                            metricsSettings={metricsSettings}
                                            paidMembersEnabled={paidMembersEnabled}
                                            post={item}
                                            resource={resource}
                                            showGiftLink={menuGiftLinkPostId === item.id}
                                            timezone={timezone}
                                            visitorCounts={visitorCounts}
                                            onSelectClick={selection.onRowClick}
                                            onSelectMouseDown={selection.onRowMouseDown}
                                        />
                                    ))}
                                </ul>
                                {/* Plain pager for now. Phase 5 adds the
                                    metrics columns and Phase 10 checks
                                    performance on large sites; the virtualised
                                    scroll the members list uses lands with
                                    whichever of those needs it first. */}
                                {hasNextPage && (
                                    <LoadMoreButton
                                        isLoading={isFetchingNextPage}
                                        onClick={fetchNextPage}
                                    />
                                )}
                            </Stack>
                        )}
                    </ListPage.Body>
                </ListPage>
                {pendingBulkAction && CONFIRMABLE_ACTIONS.includes(pendingBulkAction.key) && (
                    <ConfirmBulkActionModal
                        action={pendingBulkAction.key as BulkConfirmKey}
                        count={pendingBulkAction.snapshot.count}
                        isRunning={bulkActions.isRunning}
                        isSingle={pendingBulkAction.snapshot.isSingle}
                        resource={resource}
                        title={pendingBulkAction.snapshot.posts[0]?.title}
                        onCancel={() => {
                            setPendingBulkAction(null);
                        }}
                        onConfirm={() => {
                            void bulkActions.run(pendingBulkAction.key, pendingBulkAction.snapshot);
                        }}
                    />
                )}
                {pendingBulkAction?.key === 'add-tag' && (
                    <AddTagModal
                        appliedTags={pendingBulkAction.snapshot.isSingle
                            ? pendingBulkAction.snapshot.posts[0]?.tags?.flatMap(tag => (
                                tag.name ? [{id: tag.id, name: tag.name, slug: tag.slug}] : []
                            )) ?? []
                            : []}
                        isRunning={bulkActions.isRunning}
                        onCancel={() => {
                            setPendingBulkAction(null);
                        }}
                        onConfirm={(tags) => {
                            void bulkActions.runWithPayload('add-tag', pendingBulkAction.snapshot, {tags});
                        }}
                    />
                )}
                {pendingBulkAction?.key === 'change-access' && (
                    <ChangeAccessModal
                        count={pendingBulkAction.snapshot.count}
                        currentTiers={pendingBulkAction.snapshot.posts[0]?.tiers as {id: string}[] | undefined}
                        currentVisibility={pendingBulkAction.snapshot.posts[0]?.visibility}
                        isRunning={bulkActions.isRunning}
                        isSingle={pendingBulkAction.snapshot.isSingle}
                        resource={resource}
                        onCancel={() => {
                            setPendingBulkAction(null);
                        }}
                        onConfirm={(access) => {
                            void bulkActions.runWithPayload('change-access', pendingBulkAction.snapshot, access);
                        }}
                    />
                )}
                {celebration.celebration && celebration.post && (
                    <PostCelebrationModal
                        post={celebration.post}
                        postCount={celebration.postCount}
                        siteTitle={siteData?.site.title ?? ''}
                        type={celebration.celebration.type}
                        wasPublished={celebration.celebration.wasPublished}
                        onClose={celebration.dismiss}
                    />
                )}
                {giftLinkPostId && (
                    <Suspense fallback={null}>
                        <GiftLinkModal
                            postId={giftLinkPostId}
                            resource={resource}
                            source='context-menu'
                            open
                            onOpenChange={(open) => {
                                if (!open) {
                                    setGiftLinkPostId(null);
                                }
                            }}
                        />
                    </Suspense>
                )}
            </Container>
        </Box>
    );
}
