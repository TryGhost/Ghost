import {AppContext} from '../../../../src/app-context';
import {CommentComponent} from '../../../../src/components/content/comment';
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
});

