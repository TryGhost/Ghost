import Content from '../../../../src/components/content/content';
import {AppContext} from '../../../../src/app-context';
import {act, render, screen} from '@testing-library/react';
import {buildComment} from '../../../utils/fixtures';

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
        pageUrl: 'https://example.com/post',
        isMember,
        isPaidOnly,
        hasRequiredTier,
        isCommentingDisabled,
        dispatchAction: () => {},
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

    describe('threaded display', function () {
        it('passes the commentsThreads display mode through to rendered comments', function () {
            const reply1 = buildComment({
                html: '<p>First reply</p>'
            });
            const reply2 = buildComment({
                html: '<p>Second reply</p>'
            });
            const reply3 = buildComment({
                html: '<p>Third reply</p>'
            });
            const reply4 = buildComment({
                html: '<p>Nested reply</p>',
                in_reply_to_id: reply1.id,
                in_reply_to_snippet: 'First reply'
            });
            const comment = buildComment({
                html: '<p>Parent comment</p>',
                replies: [reply1, reply2, reply3, reply4],
                count: {
                    replies: 4
                }
            });

            contextualRender(<Content />, {
                appContext: {
                    comments: [comment],
                    commentCount: 1,
                    labs: {
                        commentsThreads: true
                    }
                }
            });

            expect(screen.getByText('Nested reply')).toBeInTheDocument();
            expect(screen.queryByText('Replied to')).not.toBeInTheDocument();
            expect(screen.queryByTestId('replies-pagination')).not.toBeInTheDocument();
        });
    });
});
