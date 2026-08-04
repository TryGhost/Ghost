import {Box, Container, Stack, Text} from '@tryghost/shade/primitives';
import {Button, LoadingIndicator} from '@tryghost/shade/components';
import {ListPage} from '@tryghost/shade/page-templates';
import {LoadMoreButton} from '@/shared/virtual-list';
import {LucideIcon} from '@tryghost/shade/utils';
import {PageHeader} from '@tryghost/shade/patterns';
import {isAuthorOrContributor} from '@tryghost/admin-x-framework/api/users';
import {type PostResource, getPostResourceCopy} from './post-resource';
import {useCurrentUser} from '@tryghost/admin-x-framework/api/current-user';
import {usePostsFilterState} from './hooks/use-posts-filter-state';
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
    const {params} = usePostsFilterState();
    const {data: currentUser} = useCurrentUser();

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
                        ) : (
                            // Deliberately the same testids the Ember list
                            // uses — including on pages, which shares the
                            // Ember component — so the e2e page objects can
                            // eventually target both implementations. They
                            // can never collide: the Ember route aborts when
                            // this screen renders.
                            //
                            // Not yet interchangeable, though: PostsPage's
                            // getPostByTitle matches an h3 inside the row, and
                            // waitForPageToFullyLoad expects `posts-list` to
                            // exist in the empty state too (Ember renders it
                            // unconditionally). Phase 2 brings the real row
                            // markup; Phase 10 reconciles the page object and
                            // re-baselines the visual-regression shots.
                            <Stack gap='md'>
                                <ul data-testid='posts-list'>
                                    {items.map(item => (
                                        <li key={item.id} data-testid='posts-list-item'>
                                            {item.title}
                                        </li>
                                    ))}
                                </ul>
                                {/* Placeholder pager. Phase 2 replaces this
                                    with the virtualised infinite scroll the
                                    members list uses; without something here
                                    a site with 30+ scheduled posts would show
                                    only the first page and never reach its
                                    drafts. */}
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
