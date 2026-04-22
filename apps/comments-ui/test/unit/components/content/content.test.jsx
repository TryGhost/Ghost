import Content from '../../../../src/components/content/content';
import {AppContext} from '../../../../src/app-context';
import {render, screen, act} from '@testing-library/react';

const contextualRender = (ui, {appContext, ...renderOptions}) => {
    const member = appContext?.member ?? null;
    const commentsEnabled = appContext?.commentsEnabled ?? 'all';

    // Compute tier values like app.tsx does
    const isMember = !!member;
    const isPaidOnly = commentsEnabled === 'paid';
    const isPaidMember = member && !!member.paid;
    const hasRequiredTier = isPaidMember || !isPaidOnly;
    const isCommentingDisabled = member?.can_comment === false;

    const contextWithDefaults = {
        commentsEnabled,
        comments: [],
        openCommentForms: [],
        member,
        isMember,
        isPaidOnly,
        hasRequiredTier,
        isCommentingDisabled,
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

    describe('hashchange listener', function () {
        let originalParent;

        beforeEach(() => {
            originalParent = window.parent;
        });

        afterEach(() => {
            Object.defineProperty(window, 'parent', {
                value: originalParent,
                writable: true,
                configurable: true
            });
        });

        it('does not throw when window.parent becomes null after mount', function () {
            // Track errors thrown during event dispatch (jsdom reports these
            // as uncaught errors even though they happen inside an event handler)
            const errors = [];
            const onError = (e) => {
                errors.push(e);
                e.preventDefault();
            };
            window.addEventListener('error', onError);

            contextualRender(<Content />, {appContext: {}});

            // Simulate iframe detachment: window.parent becomes null.
            // This happens when the iframe is removed from the DOM while
            // a hashchange event is still queued on the parent window.
            Object.defineProperty(window, 'parent', {
                value: null,
                writable: true,
                configurable: true
            });

            act(() => {
                // Dispatch hashchange on the original parent window — this is
                // what happens in production: the listener was added to the parent,
                // and the event fires after the iframe is detached
                originalParent.dispatchEvent(new HashChangeEvent('hashchange'));
            });

            window.removeEventListener('error', onError);
            expect(errors).toHaveLength(0);
        });

        it('cleanup does not throw when window.parent becomes null on unmount', function () {
            const errors = [];
            const onError = (e) => {
                errors.push(e);
                e.preventDefault();
            };
            window.addEventListener('error', onError);

            const {unmount} = contextualRender(<Content />, {appContext: {}});

            // Simulate iframe detachment before React cleanup runs
            Object.defineProperty(window, 'parent', {
                value: null,
                writable: true,
                configurable: true
            });

            // Unmounting triggers the useEffect cleanup which calls
            // window.parent.removeEventListener — this should not throw
            unmount();

            window.removeEventListener('error', onError);
            expect(errors).toHaveLength(0);
        });
    });
});
