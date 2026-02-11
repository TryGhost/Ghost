import Pagination from '../../../../src/components/content/pagination';
import i18nLib from '@tryghost/i18n';
import {AppContext} from '../../../../src/app-context';
import {render, screen} from '@testing-library/react';

const i18n = i18nLib('en', 'comments');

const contextualRender = (ui, {appContext, ...renderOptions}) => {
    const contextWithDefaults = {
        ...appContext,
        t: i18n.t
    };

    return render(
        <AppContext.Provider value={contextWithDefaults}>{ui}</AppContext.Provider>,
        renderOptions
    );
};

describe('<Pagination>', function () {
    it('has correct text for 1 more', function () {
        contextualRender(<Pagination />, {appContext: {
            pagination: {total: 4, limit: 3, next: 'cursor_next', prev: null},
            comments: [{id: '1'}, {id: '2'}, {id: '3'}]
        }});
        expect(screen.getByText('Load more (1)')).toBeInTheDocument();
    });

    it('has correct text for x more', function () {
        contextualRender(<Pagination />, {appContext: {
            pagination: {total: 6, limit: 3, next: 'cursor_next', prev: null},
            comments: [{id: '1'}, {id: '2'}, {id: '3'}]
        }});
        expect(screen.getByText('Load more (3)')).toBeInTheDocument();
    });

    it('does not render when next cursor is null', function () {
        contextualRender(<Pagination />, {appContext: {
            pagination: {total: 3, limit: 3, next: null, prev: null},
            comments: [{id: '1'}, {id: '2'}, {id: '3'}]
        }});
        expect(screen.queryByText(/Load more/)).not.toBeInTheDocument();
    });
});
