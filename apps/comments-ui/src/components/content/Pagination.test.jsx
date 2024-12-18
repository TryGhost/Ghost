import Pagination from './Pagination';
import {AppContext} from '../../AppContext';
import {render, screen} from '@testing-library/react';

const contextualRender = (ui, {appContext, ...renderOptions}) => {
    const contextWithDefaults = {
        t: (str, replacements) => {
            if (replacements) {
                return str.replace(/{{([^{}]*)}}/g, (_, key) => replacements[key]);
            }
            return str;
        },
        ...appContext
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
