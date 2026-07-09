import PostAnalyticsProvider, {useGlobalData} from '@src/providers/post-analytics-context';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {createTestWrapper, endpoint, mockServer} from '../../utils/msw-helpers';
import {render, screen, waitFor} from '@testing-library/react';

// The provider reads the resource id from the route. Everything else (config,
// site, settings, posts, pages) is served over MSW.
vi.mock('@tryghost/admin-x-framework', async (importOriginal) => {
    const actual = await importOriginal<Record<string, unknown>>();
    return {...actual, useParams: () => ({postId: 'shared-id'})};
});

const Consumer = () => {
    const {post, postType, isPostLoading} = useGlobalData();
    if (isPostLoading) {
        return <div>loading</div>;
    }
    return (
        <div>
            <span data-testid="post-type">{postType}</span>
            <span data-testid="post-title">{post?.title ?? 'none'}</span>
            <span data-testid="post-visibility">{post?.visibility ?? 'none'}</span>
        </div>
    );
};

const renderProvider = () => render(
    <PostAnalyticsProvider><Consumer /></PostAnalyticsProvider>,
    {wrapper: createTestWrapper()}
);

describe('PostAnalyticsProvider resource resolution', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('resolves a post from the posts endpoint and reports postType "post"', async () => {
        mockServer.setup({
            posts: [{id: 'shared-id', title: 'A Post', visibility: 'public'} as never]
        });

        renderProvider();

        await waitFor(() => expect(screen.getByTestId('post-title')).toHaveTextContent('A Post'));
        expect(screen.getByTestId('post-type')).toHaveTextContent('post');
    });

    it('falls back to the pages endpoint when the posts lookup is empty', async () => {
        // The posts endpoint never returns pages, so a page id comes back empty
        // there and must be resolved via /pages/ — otherwise the analytics screen
        // (and gift-link eligibility) sees an undefined record. Regression: BER-3751.
        mockServer.setup({
            posts: [],
            customHandlers: [
                endpoint.get('/ghost/api/admin/pages/*', {
                    pages: [{id: 'shared-id', title: 'A Page', status: 'published', visibility: 'members'}]
                })
            ]
        });

        renderProvider();

        await waitFor(() => expect(screen.getByTestId('post-title')).toHaveTextContent('A Page'));
        expect(screen.getByTestId('post-type')).toHaveTextContent('page');
        expect(screen.getByTestId('post-visibility')).toHaveTextContent('members');
    });
});
