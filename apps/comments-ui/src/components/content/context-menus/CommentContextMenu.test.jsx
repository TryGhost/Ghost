import CommentContextMenu from './CommentContextMenu';
import React from 'react';
import sinon from 'sinon';
import {AppContext} from '../../../AppContext';
import {buildComment} from '../../../../test/utils/fixtures';
import {render, screen} from '@testing-library/react';

const contextualRender = (ui, {appContext, ...renderOptions}) => {
    const contextWithDefaults = {
        member: null,
        dispatchAction: () => {},
        t: str => str,
        ...appContext
    };

    return render(
        <AppContext.Provider value={contextWithDefaults}>{ui}</AppContext.Provider>,
        renderOptions
    );
};

describe('<CommentContextMenu>', () => {
    afterEach(() => {
        sinon.restore();
    });

    it('has display-below classes when in viewport', () => {
        const comment = buildComment();
        contextualRender(<CommentContextMenu comment={comment} />, {appContext: {admin: true}});
        expect(screen.getByTestId('comment-context-menu-inner')).toHaveClass('top-0');
    });

    it('has display-above classes when bottom is out of viewport', () => {
        sinon.stub(HTMLElement.prototype, 'getBoundingClientRect').returns({bottom: 2000});

        const comment = buildComment();
        contextualRender(<CommentContextMenu comment={comment} />, {appContext: {admin: true}});
        expect(screen.getByTestId('comment-context-menu-inner')).toHaveClass('bottom-full', 'mb-6');
    });
});
