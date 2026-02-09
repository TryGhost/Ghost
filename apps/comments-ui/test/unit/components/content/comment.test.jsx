import {AppContext} from '../../../../src/app-context';
import {CommentComponent, RepliedToSnippet} from '../../../../src/components/content/comment';
import {QueryClientProvider} from '@tanstack/react-query';
import {buildComment} from '../../../utils/fixtures';
import {commentKeys, queryClient} from '../../../../src/utils/query';
import {render, screen} from '@testing-library/react';

const contextualRender = (ui, {appContext, comments = [], ...renderOptions}) => {
    const postId = 'test-post';
    const order = 'desc';

    // Pre-populate React Query cache with comments
    queryClient.setQueryData(commentKeys.list(postId, order), {
        comments,
        pagination: {page: 1, limit: 20, pages: 1, total: comments.length}
    });

    const contextWithDefaults = {
        commentsEnabled: 'all',
        openCommentForms: [],
        member: null,
        pageUrl: 'https://example.com/post',
        commentIdToScrollTo: null,
        postId,
        order,
        initStatus: 'success',
        api: {},
        t: str => str,
        ...appContext
    };

    return render(
        <QueryClientProvider client={queryClient}>
            <AppContext.Provider value={contextWithDefaults}>{ui}</AppContext.Provider>
        </QueryClientProvider>,
        renderOptions
    );
};

describe('<CommentComponent>', function () {
    beforeEach(() => {
        queryClient.clear();
    });

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

        contextualRender(<CommentComponent comment={reply2} parent={parent} />, {comments: [parent]});

        expect(screen.getByText('First reply')).toBeInTheDocument();
    });

    it('outputs member uuid data attribute for published comments', function () {
        const comment = buildComment({
            status: 'published',
            member: {uuid: '123'}
        });

        const {container} = contextualRender(<CommentComponent comment={comment} />, {comments: [comment]});
        expect(container.querySelector('[data-member-uuid="123"]')).toBeInTheDocument();
    });

    it('does not output member uuid data attribute for unpublished comments', function () {
        const comment = buildComment({
            status: 'hidden',
            member: {uuid: '123'}
        });

        const {container} = contextualRender(<CommentComponent comment={comment} />, {comments: [comment]});
        expect(container.querySelector('[data-member-uuid="123"]')).not.toBeInTheDocument();
    });
});

describe('<RepliedToSnippet>', function () {
    beforeEach(() => {
        queryClient.clear();
    });

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

        contextualRender(<RepliedToSnippet comment={reply2} />, {comments: [parent]});

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

        contextualRender(<RepliedToSnippet comment={reply2} />, {comments: [parent]});

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

        contextualRender(<RepliedToSnippet comment={reply2} />, {comments: [parent]});

        const element = screen.getByTestId('comment-in-reply-to');
        expect(element).toBeInstanceOf(HTMLSpanElement);
    });
});
