import CommentContextMenu from '../../../../../src/components/content/context-menus/comment-context-menu';
import React from 'react';
import sinon from 'sinon';
import {AppContext} from '../../../../../src/app-context';
import {CommentApiContext} from '../../../../../src/components/comment-api-provider';
import {buildComment} from '../../../../utils/fixtures';
import {render, screen} from '@testing-library/react';

const contextualRender = (ui, {appContext, commentApiContext, ...renderOptions} = {}) => {
    const contextWithDefaults = {
        member: null,
        dispatchAction: () => {},
        t: str => str,
        ...appContext
    };

    const commentApiWithDefaults = {
        commentApi: {isAdmin: false},
        admin: null,
        adminComments: null,
        isAdmin: false,
        adminUrl: undefined,
        initAdminAuth: async () => {},
        setMember: () => {},
        ...commentApiContext
    };

    return render(
        <CommentApiContext.Provider value={commentApiWithDefaults}>
            <AppContext.Provider value={contextWithDefaults}>{ui}</AppContext.Provider>
        </CommentApiContext.Provider>,
        renderOptions
    );
};

describe('<CommentContextMenu>', () => {
    afterEach(() => {
        sinon.restore();
    });

    it('has display-below classes when in viewport', () => {
        const comment = buildComment();
        contextualRender(<CommentContextMenu comment={comment} />, {commentApiContext: {isAdmin: true}});
        expect(screen.getByTestId('comment-context-menu-inner')).toHaveClass('top-0');
    });

    it('has display-above classes when bottom is out of viewport', () => {
        sinon.stub(HTMLElement.prototype, 'getBoundingClientRect').returns({bottom: 2000});

        const comment = buildComment();
        contextualRender(<CommentContextMenu comment={comment} />, {commentApiContext: {isAdmin: true}});
        expect(screen.getByTestId('comment-context-menu-inner')).toHaveClass('bottom-full', 'mb-6');
    });
});
