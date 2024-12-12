import {AppContext} from '../../AppContext';
import {CommentComponent, RepliedToSnippet} from './Comment';
import {buildComment} from '../../../test/utils/fixtures';
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
        const appContext = {comments: [parent], labs: {commentImprovements: true}};

        contextualRender(<CommentComponent comment={reply2} parent={parent} />, {appContext});

        expect(screen.getByText('First reply')).toBeInTheDocument();
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
        const appContext = {comments: [parent], labs: {commentImprovements: true}};

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
        const appContext = {comments: [parent], labs: {commentImprovements: true}};

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
        const appContext = {comments: [parent], labs: {commentImprovements: true}};

        contextualRender(<RepliedToSnippet comment={reply2} />, {appContext});

        const element = screen.getByTestId('comment-in-reply-to');
        expect(element).toBeInstanceOf(HTMLSpanElement);
    });
});
