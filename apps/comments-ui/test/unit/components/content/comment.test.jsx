import {AppContext} from '../../../../src/app-context';
import {CommentComponent, RepliedToSnippet} from '../../../../src/components/content/comment';
import {buildComment} from '../../../utils/fixtures';
import {render, screen} from '@testing-library/react';

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

    it('renders nested reply threads when commentsThreads is enabled', function () {
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
            dispatchAction: () => {},
            labs: {
                commentsThreads: true
            }
        };

        const {container} = contextualRender(<CommentComponent comment={comment} useThreading={true} />, {appContext});

        expect(screen.getByText('First reply')).toBeInTheDocument();
        expect(screen.getByText('Second reply')).toBeInTheDocument();
        expect(container.ownerDocument.getElementById(reply2.id)).toHaveAttribute('data-testid', 'animated-comment');
        expect(screen.queryByTestId('replies-pagination')).not.toBeInTheDocument();
    });

    it('hides reply-to-reply context when commentsThreads is enabled', function () {
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
            comments: [parent],
            labs: {
                commentsThreads: true
            }
        };

        contextualRender(<CommentComponent comment={reply2} parent={parent} useThreading={true} />, {appContext});

        expect(screen.queryByText('Replied to')).not.toBeInTheDocument();
        expect(screen.queryByText('First reply')).not.toBeInTheDocument();
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
