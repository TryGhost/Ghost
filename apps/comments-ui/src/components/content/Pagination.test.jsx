import Pagination from './Pagination';
import i18nLib from '@tryghost/i18n';
import {AppContext} from '../../AppContext';
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
        contextualRender(<Pagination />, {appContext: {pagination: {total: 4, page: 1, limit: 3}}});
        expect(screen.getByText('Load more (1)')).toBeInTheDocument();
    });

    it('has correct text for x more', function () {
        contextualRender(<Pagination />, {appContext: {pagination: {total: 6, page: 1, limit: 3}}});
        expect(screen.getByText('Load more (3)')).toBeInTheDocument();
    });
});
