import CommentContextMenu from '../../../../../src/components/content/context-menus/comment-context-menu';
import React from 'react';
import sinon from 'sinon';
import {AppContext} from '../../../../../src/app-context';
import {buildComment} from '../../../../utils/fixtures';
import {fireEvent, render, screen} from '@testing-library/react';

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

    it('shows pin action for top-level comments when admin', () => {
        const dispatchAction = sinon.spy();
        const comment = buildComment({pinned: false});

        contextualRender(<CommentContextMenu close={() => {}} comment={comment} />, {appContext: {dispatchAction, isAdmin: true}});

        fireEvent.click(screen.getByTestId('pin-button'));

        expect(dispatchAction.calledWith('pinComment', comment)).toBe(true);
    });

    it('shows pin action for own comments when admin', () => {
        const dispatchAction = sinon.spy();
        const member = {uuid: 'member-uuid'};
        const comment = buildComment({
            member: {
                uuid: member.uuid
            },
            pinned: false
        });

        contextualRender(<CommentContextMenu close={() => {}} comment={comment} toggleEdit={() => {}} />, {appContext: {dispatchAction, isAdmin: true, member}});

        expect(screen.getByTestId('edit')).toBeInTheDocument();
        expect(screen.getByTestId('delete')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('pin-button'));

        expect(dispatchAction.calledWith('pinComment', comment)).toBe(true);
    });

    it('shows unpin action for pinned top-level comments when admin', () => {
        const dispatchAction = sinon.spy();
        const comment = buildComment({pinned: true});

        contextualRender(<CommentContextMenu close={() => {}} comment={comment} />, {appContext: {dispatchAction, isAdmin: true}});

        fireEvent.click(screen.getByTestId('unpin-button'));

        expect(dispatchAction.calledWith('unpinComment', comment)).toBe(true);
    });

    it('does not show pin action for replies', () => {
        const comment = buildComment({parent_id: buildComment().id});

        contextualRender(<CommentContextMenu close={() => {}} comment={comment} />, {appContext: {isAdmin: true}});

        expect(screen.queryByTestId('pin-button')).not.toBeInTheDocument();
        expect(screen.queryByTestId('unpin-button')).not.toBeInTheDocument();
    });
});
