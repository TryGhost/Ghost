import {AppContext} from '../../../../src/app-context';
import {CommentComponent, RepliedToSnippet} from '../../../../src/components/content/comment';
import {buildComment} from '../../../utils/fixtures';
import {fireEvent, render, screen} from '@testing-library/react';

const contextualRender = (ui, {appContext, ...renderOptions}) => {
    const contextWithDefaults = {
        commentsEnabled: 'all',
        comments: [],
        openCommentForms: [],
        member: null,
        pageUrl: 'https://example.com/post',
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
    it('renders reply-to-reply content', function () {
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
        const appContext = {comments: [parent]};

        contextualRender(<CommentComponent comment={reply2} parent={parent} />, {appContext});

        expect(screen.getByText('First reply')).toBeInTheDocument();
    });

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

    it('renders pinned badge inline after the timestamp', function () {
        const comment = buildComment({
            pinned: true
        });
        const appContext = {comments: [comment]};

        contextualRender(<CommentComponent comment={comment} />, {appContext});

        const label = screen.getByTestId('pinned-comment-label');
        expect(label.parentElement).toHaveClass('ml-2');
        expect(label.parentElement?.parentElement?.querySelector('a')).toHaveAttribute('href', `https://example.com/post#ghost-comments-${comment.id}`);
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

    it('keeps a bottom gap after pinned comments with replies', function () {
        const reply = buildComment({
            html: '<p>Reply</p>'
        });
        const comment = buildComment({
            pinned: true,
            replies: [reply]
        });
        const appContext = {comments: [comment]};

        const {container} = contextualRender(<CommentComponent comment={comment} />, {appContext});

        const pinnedComment = container.querySelector('[data-pinned="true"]');
        expect(pinnedComment).toHaveClass('mb-4');
        expect(pinnedComment).toHaveClass('py-3');
    });
});

describe('<RepliedToSnippet>', function () {
    it('renders a link when replied-to comment is published', function () {
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
        const appContext = {comments: [parent]};

        contextualRender(<RepliedToSnippet comment={reply2} />, {appContext});

        const element = screen.getByTestId('comment-in-reply-to');
        expect(element).toBeInstanceOf(HTMLAnchorElement);
    });

    it('does not render a link when replied-to comment is deleted', function () {
        const reply1 = buildComment({
            html: '<p>First reply</p>',
            status: 'deleted'
        });
        const reply2 = buildComment({
            in_reply_to_id: reply1.id,
            in_reply_to_snippet: 'First reply',
            html: '<p>Second reply</p>'
        });
        const parent = buildComment({
            replies: [reply1, reply2]
        });
        const appContext = {comments: [parent]};

        contextualRender(<RepliedToSnippet comment={reply2} />, {appContext});

        const element = screen.getByTestId('comment-in-reply-to');
        expect(element).toBeInstanceOf(HTMLSpanElement);
    });

    it('does not render a link when replied-to comment is missing (i.e. removed)', function () {
        const reply2 = buildComment({
            in_reply_to_id: 'missing',
            in_reply_to_snippet: 'First reply',
            html: '<p>Second reply</p>'
        });
        const parent = buildComment({
            replies: [reply2]
        });
        const appContext = {comments: [parent]};

        contextualRender(<RepliedToSnippet comment={reply2} />, {appContext});

        const element = screen.getByTestId('comment-in-reply-to');
        expect(element).toBeInstanceOf(HTMLSpanElement);
    });
});
