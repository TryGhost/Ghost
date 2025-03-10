import Content from './Content';
import {AppContext} from '../../AppContext';
import {render, screen} from '@testing-library/react';

const contextualRender = (ui, {appContext, ...renderOptions}) => {
    const contextWithDefaults = {
        commentsEnabled: 'all',
        comments: [],
        openCommentForms: [],
        member: null,
        t: str => str,
        ...appContext
    };

    return render(
        <AppContext.Provider value={contextWithDefaults}>{ui}</AppContext.Provider>,
        renderOptions
    );
};

describe('<Content>', function () {
    describe('main form or cta', function () {
        it('renders CTA when not logged in', function () {
            contextualRender(<Content />, {appContext: {}});
            expect(screen.queryByTestId('cta-box')).toBeInTheDocument();
            expect(screen.queryByTestId('main-form')).not.toBeInTheDocument();
        });

        it('renders CTA when logged in as free member on a paid-only site', function () {
            contextualRender(<Content />, {appContext: {member: {paid: false}, commentsEnabled: 'paid'}});
            expect(screen.queryByTestId('cta-box')).toBeInTheDocument();
            expect(screen.queryByTestId('main-form')).not.toBeInTheDocument();
        });

        it('renders form when logged in', function () {
            contextualRender(<Content />, {appContext: {member: {}}});
            expect(screen.queryByTestId('cta-box')).not.toBeInTheDocument();
            expect(screen.queryByTestId('main-form')).toBeInTheDocument();
        });

        it('renders form when logged in as paid member on paid-only site', function () {
            contextualRender(<Content />, {appContext: {member: {paid: true}, commentsEnabled: 'paid'}});
            expect(screen.queryByTestId('cta-box')).not.toBeInTheDocument();
            expect(screen.queryByTestId('main-form')).toBeInTheDocument();
        });

        it('renders main form when a reply form is open', function () {
            contextualRender(<Content />, {appContext: {member: {}, openFormCount: 1}});
            expect(screen.queryByTestId('cta-box')).not.toBeInTheDocument();
            expect(screen.queryByTestId('main-form')).toBeInTheDocument();
        });
    });
});
