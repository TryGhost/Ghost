import Pagination from '../../../../src/components/content/pagination';
import i18nLib from '@tryghost/i18n';
import {AppContext} from '../../../../src/app-context';
import {QueryClientProvider} from '@tanstack/react-query';
import {commentKeys, queryClient} from '../../../../src/utils/query';
import {render, screen} from '@testing-library/react';

const i18n = i18nLib('en', 'comments');

const contextualRender = (ui, {appContext, pagination, ...renderOptions}) => {
    const postId = 'test-post';
    const order = 'desc';

    // Pre-populate React Query cache with pagination data
    queryClient.setQueryData(commentKeys.list(postId, order), {
        comments: [],
        pagination
    });

    const contextWithDefaults = {
        postId,
        order,
        initStatus: 'success',
        api: {},
        ...appContext,
        t: i18n.t
    };

    return render(
        <QueryClientProvider client={queryClient}>
            <AppContext.Provider value={contextWithDefaults}>{ui}</AppContext.Provider>
        </QueryClientProvider>,
        renderOptions
    );
};

describe('<Pagination>', function () {
    beforeEach(() => {
        queryClient.clear();
    });

    it('has correct text for 1 more', function () {
        contextualRender(<Pagination />, {pagination: {total: 4, page: 1, limit: 3}});
        expect(screen.getByText('Load more (1)')).toBeInTheDocument();
    });

    it('has correct text for x more', function () {
        contextualRender(<Pagination />, {pagination: {total: 6, page: 1, limit: 3}});
        expect(screen.getByText('Load more (3)')).toBeInTheDocument();
    });
});
