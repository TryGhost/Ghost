import {Box, Container, Stack, Text} from '@tryghost/shade/primitives';
import {Button, LoadingIndicator} from '@tryghost/shade/components';
import {ListPage} from '@tryghost/shade/page-templates';
import {LoadMoreButton} from '@/shared/virtual-list';
import {LucideIcon} from '@tryghost/shade/utils';
import {FilterBar, PageHeader} from '@tryghost/shade/patterns';
import {PostListRow} from './components/post-list-row';
import {PostsEmptyState} from './components/posts-empty-state';
import {PostsFilters} from './components/posts-filters';
import {ManagePostViewPopover} from './components/manage-post-view-popover';
import {POST_DEFAULT_VIEWS} from '@/layout/app-sidebar/post-sidebar-views';
import {PostsSortMenu} from './components/posts-sort-menu';
import {canSavePostView, findActivePostView} from './post-views';

import {usePostViews} from './hooks/use-post-views';
import {getSettingValue, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {hasAdminAccess, isAuthorOrContributor, isContributorUser} from '@tryghost/admin-x-framework/api/users';
import {type PostResource, getPostResourceCopy} from './post-resource';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';
import {usePostsFilterState} from './hooks/use-posts-filter-state';
import {rememberStickyPostFilters} from './posts-sticky-filters';
import {useEffect} from 'react';
import {useLocation} from '@tryghost/admin-x-framework';
import {usePostsList} from './hooks/use-posts-list';

/**
 * The React posts and pages list screens, served behind the `postsListReact`
 * Labs flag. One implementation, two resources — see `post-resource.ts`.
 *
 * Currently renders bare titles: this phase is about the data layer being
 * right (three sequenced queries, URL round-tripping), not the design.
 */
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

    const settings = settingsData?.settings ?? null;
    const metricsSettings = {
        webAnalyticsEnabled: getSettingValue<boolean>(settings, 'web_analytics_enabled') === true,
        membersTrackSources: getSettingValue<boolean>(settings, 'members_track_sources') === true,
        emailTrackOpens: getSettingValue<boolean>(settings, 'email_track_opens') === true,
        emailTrackClicks: getSettingValue<boolean>(settings, 'email_track_clicks') === true,
        membersSignupAccess: getSettingValue<string>(settings, 'members_signup_access') ?? 'all',
        isMembersInviteOnly: getSettingValue<string>(settings, 'members_signup_access') === 'invite',
        isContributor
    };

    // The save/edit-view affordance: admins only, posts only, not while a
    // default view is active, and only with something actually filtered.
    const savedViews = usePostViews();
    const activeView = findActivePostView(savedViews, params);
    const isOnDefaultView = POST_DEFAULT_VIEWS.some(view => findActivePostView([{
        ...view, route: 'posts'
    }], params));
    const canManageView = canSavePostView({
        // hasAdminAccess, not isAdminUser: Ember's isAdmin includes the Owner.
        isAdmin: Boolean(currentUser && hasAdminAccess(currentUser)),
        resource,
        params,
        isDefaultView: isOnDefaultView
    });

    // Authors and contributors only ever see their own posts, whatever the
    // `author` param says — matching PostsRoute#model in the Ember app.
    const ownAuthorSlug = currentUser && isAuthorOrContributor(currentUser)
        ? currentUser.slug
        : null;

    const {
        items,
        isLoading,
        isError,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage
    } = usePostsList({resource, params, context: {ownAuthorSlug}});

    return (
        <Box className='size-full'>
            <Container className='relative flex h-full flex-col' size='page'>
                <ListPage data-testid={`${resource}-page`}>
                    <ListPage.Header>
                        <PageHeader blurredBackground={false} sticky={false}>
                            <PageHeader.Left>
                                <PageHeader.Title>{copy.title}</PageHeader.Title>
                            </PageHeader.Left>
                            <PageHeader.Actions>
                                <PageHeader.ActionGroup>
                                    <Button asChild>
                                        <a className='font-bold' href={copy.newHref}>
                                            <LucideIcon.Plus className='size-4' />
                                            <span className='hidden sm:inline'>{copy.newLabel}</span>
                                        </a>
                                    </Button>
                                </PageHeader.ActionGroup>
                            </PageHeader.Actions>
                        </PageHeader>
                        <FilterBar>
                            <PostsFilters
                                currentUser={currentUser}
                                filters={filters}
                                params={params}
                                resource={resource}
                                onFiltersChange={setFilters}
                            />
                            <PostsSortMenu order={order} onOrderChange={setOrder} />
                            {canManageView && (
                                <ManagePostViewPopover activeView={activeView} params={params} />
                            )}
                        </FilterBar>
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
                                <ul data-testid='posts-list'>
                                    {items.map(item => (
                                        <PostListRow
                                            key={item.id}
                                            isContributor={isContributor}
                                            metricsSettings={metricsSettings}
                                            post={item}
                                            resource={resource}
                                            timezone={timezone}
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
            </Container>
        </Box>
    );
}
