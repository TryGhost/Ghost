import PinnedLabel from '../../../../src/components/content/pinned-label';
import {AppContext} from '../../../../src/app-context';
import {buildComment} from '../../../utils/fixtures';
import {fireEvent, render, screen} from '@testing-library/react';

const contextualRender = (ui, {appContext, ...renderOptions} = {}) => {
    const contextWithDefaults = {
        commentsEnabled: 'all',
        comments: [],
        openCommentForms: [],
        member: null,
        commentIdToScrollTo: null,
        t: str => str,
        ...appContext
    };

    return render(
        <AppContext.Provider value={contextWithDefaults}>{ui}</AppContext.Provider>,
        renderOptions
    );
};

describe('<PinnedLabel>', function () {
    it('returns null when the comment is not pinned', function () {
        const comment = buildComment({pinned: false});

        const {container} = contextualRender(<PinnedLabel comment={comment} />);

        expect(container).toBeEmptyDOMElement();
    });

    it('renders a non-interactive badge for non-admins', function () {
        const comment = buildComment({pinned: true});

        contextualRender(<PinnedLabel comment={comment} />, {
            appContext: {isAdmin: false}
        });

        const label = screen.getByTestId('pinned-comment-label');
        expect(label.tagName).toBe('SPAN');
        expect(label).toHaveTextContent('Pinned');
    });

    it('renders an unpin button that dispatches unpinComment for admins', function () {
        const comment = buildComment({pinned: true});
        const dispatchAction = vi.fn();

        contextualRender(<PinnedLabel comment={comment} />, {
            appContext: {isAdmin: true, dispatchAction}
        });

        const button = screen.getByRole('button', {name: 'Unpin comment'});
        fireEvent.click(button);

        expect(dispatchAction).toHaveBeenCalledWith('unpinComment', comment);
    });
});
