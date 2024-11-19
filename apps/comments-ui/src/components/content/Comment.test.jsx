import {AppContext} from '../../AppContext';
import {CommentComponent} from './Comment';
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
        const appContext = {labs: {commentImprovements: true}};
        const parent = {
            id: '1',
            status: 'published',
            count: {likes: 0}
        };
        const comment = {
            id: '3',
            status: 'published',
            in_reply_to_id: '2',
            in_reply_to_snippet: 'First reply',
            html: '<p>Second reply</p>',
            count: {likes: 0}
        };

        contextualRender(<CommentComponent comment={comment} parent={parent} />, {appContext});

        expect(screen.queryByText('First reply')).toBeInTheDocument();
    });
});
