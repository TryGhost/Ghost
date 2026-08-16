import React from 'react';
import {AppContext} from '../../../../src/app-context';
import {CommentComponent} from '../../../../src/components/content/comment';
import {buildComment} from '../../../utils/fixtures';
import {fireEvent, render, screen} from '@testing-library/react';
import {vi} from 'vitest';

vi.mock('../../../../src/components/content/forms/reply-form', () => ({
    default: () => React.createElement('div', {'data-testid': 'reply-form'}, 'Reply form')
}));

const contextualRender = (ui, {appContext, ...renderOptions}) => {
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

describe('<CommentComponent>', function () {
    it('outputs member uuid data attribute for published comments', function () {
        const comment = buildComment({
            status: 'published',
            member: {uuid: '123'}
        });
        const appContext = {comments: [comment]};

        const {container} = contextualRender(<CommentComponent comment={comment} />, {appContext});
        expect(container.querySelector('[data-member-uuid="123"]')).toBeInTheDocument();
    });

    it('does not output member uuid data attribute for unpublished comments', function () {
        const comment = buildComment({
            status: 'hidden',
            member: {uuid: '123'}
        });
        const appContext = {comments: [comment]};

        const {container} = contextualRender(<CommentComponent comment={comment} />, {appContext});
        expect(container.querySelector('[data-member-uuid="123"]')).not.toBeInTheDocument();
    });

    it('renders an icon-only dislike control', function () {
        const comment = buildComment({
            disliked: true,
            count: {
                likes: 3
            }
        });
        const appContext = {comments: [comment], dispatchAction: () => {}};

        contextualRender(<CommentComponent comment={comment} />, {appContext});

        expect(screen.getByTestId('dislike-button')).toBeInTheDocument();
        expect(screen.getByTestId('dislike-button')).toHaveAccessibleName('Remove dislike');
        expect(screen.getByTestId('dislike-button')).not.toHaveTextContent(/\d/);
    });

    it('renders nested reply threads', function () {
        const reply1 = buildComment({
            html: '<p>First reply</p>'
        });
        const reply2 = buildComment({
            in_reply_to_id: reply1.id,
            html: '<p>Second reply</p>'
        });
        const comment = buildComment({
            replies: [reply1, reply2],
            count: {
                replies: 2
            }
        });
        const appContext = {
            comments: [comment],
            dispatchAction: () => {}
        };

        const {container} = contextualRender(<CommentComponent comment={comment} />, {appContext});

        expect(screen.getByText('First reply')).toBeInTheDocument();
        expect(screen.getByText('Second reply')).toBeInTheDocument();
        expect(container.ownerDocument.getElementById(reply2.id)).toHaveTextContent('Second reply');
        expect(screen.queryByTestId('replies-pagination')).not.toBeInTheDocument();
    });

    it('does not render reply-to-reply context', function () {
        const reply1 = buildComment({
            html: '<p>First reply</p>'
        });
        const reply2 = buildComment({
            in_reply_to_id: reply1.id,
            in_reply_to_snippet: 'First reply',
            html: '<p>Second reply</p>'
        });
        const parent = buildComment({
            replies: [reply1, reply2]
        });
        const appContext = {
            comments: [parent]
        };

        contextualRender(<CommentComponent comment={reply2} parent={parent} />, {appContext});

        expect(screen.queryByText('Replied to')).not.toBeInTheDocument();
        expect(screen.queryByText('First reply')).not.toBeInTheDocument();
    });

    it('renders threaded reply forms directly below the comment being replied to', function () {
        const reply1 = buildComment({
            html: '<p>First reply</p>'
        });
        const reply2 = buildComment({
            in_reply_to_id: reply1.id,
            html: '<p>Second reply</p>'
        });
        const parent = buildComment({
            replies: [reply1, reply2],
            count: {
                replies: 2
            }
        });
        const appContext = {
            comments: [parent],
            dispatchAction: () => {},
            openCommentForms: [{
                id: reply1.id,
                parent_id: parent.id,
                type: 'reply',
                hasUnsavedChanges: false
            }]
        };

        contextualRender(<CommentComponent comment={parent} />, {appContext});

        const replyForm = screen.getByTestId('reply-form');
        const firstReply = document.getElementById(reply1.id);
        const secondReply = document.getElementById(reply2.id);

        expect(firstReply.compareDocumentPosition(replyForm) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(replyForm.compareDocumentPosition(secondReply) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('continues the threaded reply form line when child replies remain below it', function () {
        const reply1 = buildComment({
            html: '<p>First reply</p>'
        });
        const reply2 = buildComment({
            in_reply_to_id: reply1.id,
            html: '<p>Second reply</p>'
        });
        const parent = buildComment({
            replies: [reply1, reply2],
            count: {
                replies: 2
            }
        });
        const appContext = {
            comments: [parent],
            dispatchAction: () => {},
            openCommentForms: [{
                id: reply1.id,
                parent_id: parent.id,
                type: 'reply',
                hasUnsavedChanges: false
            }]
        };

        contextualRender(<CommentComponent comment={parent} />, {appContext});

        expect(screen.getByTestId('reply-form-elbow')).toBeInTheDocument();
        expect(screen.getByTestId('reply-form-continuation-line')).toBeInTheDocument();
    });

    it('does not continue the threaded reply form line when there are no child replies below it', function () {
        const comment = buildComment({
            html: '<p>Parent comment</p>',
            count: {
                replies: 0
            }
        });
        const appContext = {
            comments: [comment],
            dispatchAction: () => {},
            openCommentForms: [{
                id: comment.id,
                type: 'reply',
                hasUnsavedChanges: false
            }]
        };

        contextualRender(<CommentComponent comment={comment} />, {appContext});

        expect(screen.getByTestId('reply-form-elbow')).toBeInTheDocument();
        expect(screen.queryByTestId('reply-form-continuation-line')).not.toBeInTheDocument();
    });

    it('renders pinned badge inline after the timestamp', function () {
        const comment = buildComment({
            pinned: true
        });
        const appContext = {comments: [comment]};

        contextualRender(<CommentComponent comment={comment} />, {appContext});

        const label = screen.getByTestId('pinned-comment-label');
        expect(label.parentElement).toHaveClass('ml-2');
        expect(label.parentElement?.parentElement?.querySelector('a')).toHaveAttribute('href', `#ghost-comments-${comment.id}`);
    });

    it('renders pinned badge as an unpin button for admins', function () {
        const comment = buildComment({
            pinned: true
        });
        const dispatchAction = vi.fn();
        const appContext = {comments: [comment], dispatchAction, isAdmin: true};

        contextualRender(<CommentComponent comment={comment} />, {appContext});

        const button = screen.getByRole('button', {name: 'Unpin comment'});

        expect(button).toHaveTextContent('Pinned');
        expect(button).toHaveTextContent('Unpin');

        fireEvent.click(button);

        expect(dispatchAction).toHaveBeenCalledWith('unpinComment', comment);
    });

});
