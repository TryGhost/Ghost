import CommentContextMenu from '../../../../../src/components/content/context-menus/comment-context-menu';
import React from 'react';
import sinon from 'sinon';
import { AppContext } from '../../../../../src/app-context';
import { buildComment } from '../../../../utils/fixtures';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const contextualRender = (ui, { appContext, ...renderOptions }) => {
  const contextWithDefaults = {
    member: null,
    dispatchAction: () => {},
    t: (str) => str,
    ...appContext,
  };

  return render(
    <AppContext.Provider value={contextWithDefaults}>{ui}</AppContext.Provider>,
    renderOptions,
  );
};

describe('<CommentContextMenu>', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('has display-below classes when in viewport', () => {
    const comment = buildComment();
    contextualRender(<CommentContextMenu comment={comment} />, { appContext: { admin: true } });
    expect(screen.getByTestId('comment-context-menu-inner')).toHaveClass('top-0');
  });

  it('has display-above classes when bottom is out of viewport', () => {
    sinon.stub(HTMLElement.prototype, 'getBoundingClientRect').returns({ bottom: 2000 });

    const comment = buildComment();
    contextualRender(<CommentContextMenu comment={comment} />, { appContext: { admin: true } });
    expect(screen.getByTestId('comment-context-menu-inner')).toHaveClass('bottom-full', 'mb-6');
  });

  it('shows pin action for top-level comments when admin', () => {
    const dispatchAction = sinon.spy();
    const comment = buildComment({ pinned: false });

    contextualRender(<CommentContextMenu close={() => {}} comment={comment} />, {
      appContext: { dispatchAction, isAdmin: true },
    });

    fireEvent.click(screen.getByTestId('pin-button'));

    expect(dispatchAction.calledWith('pinComment', comment)).toBe(true);
  });

  it('shows pin action for own comments when admin', () => {
    const dispatchAction = sinon.spy();
    const member = { uuid: 'member-uuid' };
    const comment = buildComment({
      member: {
        uuid: member.uuid,
      },
      pinned: false,
    });

    contextualRender(
      <CommentContextMenu close={() => {}} comment={comment} toggleEdit={() => {}} />,
      { appContext: { dispatchAction, isAdmin: true, member } },
    );

    expect(screen.getByTestId('edit')).toBeInTheDocument();
    expect(screen.getByTestId('delete')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('pin-button'));

    expect(dispatchAction.calledWith('pinComment', comment)).toBe(true);
  });

  it('shows unpin action for pinned top-level comments when admin', () => {
    const dispatchAction = sinon.spy();
    const comment = buildComment({ pinned: true });

    contextualRender(<CommentContextMenu close={() => {}} comment={comment} />, {
      appContext: { dispatchAction, isAdmin: true },
    });

    fireEvent.click(screen.getByTestId('unpin-button'));

    expect(dispatchAction.calledWith('unpinComment', comment)).toBe(true);
  });

  it('does not show pin action for replies', () => {
    const comment = buildComment({ parent_id: buildComment().id });

    contextualRender(<CommentContextMenu close={() => {}} comment={comment} />, {
      appContext: { isAdmin: true },
    });

    expect(screen.queryByTestId('pin-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('unpin-button')).not.toBeInTheDocument();
  });

  describe('copy link', () => {
    let writeText;
    let originalClipboard;

    beforeEach(() => {
      originalClipboard = Object.getOwnPropertyDescriptor(window.navigator, 'clipboard');
      writeText = sinon.stub().resolves();
      Object.defineProperty(window.navigator, 'clipboard', {
        configurable: true,
        value: { writeText },
      });
    });

    afterEach(() => {
      if (originalClipboard) {
        Object.defineProperty(window.navigator, 'clipboard', originalClipboard);
      } else {
        delete window.navigator.clipboard;
      }
    });

    it('shows copy link for comments by other members', () => {
      const comment = buildComment();

      contextualRender(<CommentContextMenu close={() => {}} comment={comment} />, {
        appContext: { member: { uuid: 'viewer-uuid' } },
      });

      expect(screen.getByTestId('copy-link-button')).toBeInTheDocument();
    });

    it('shows copy link for own comments', () => {
      const member = { uuid: 'member-uuid' };
      const comment = buildComment({ member: { uuid: member.uuid } });

      contextualRender(
        <CommentContextMenu close={() => {}} comment={comment} toggleEdit={() => {}} />,
        { appContext: { member } },
      );

      expect(screen.getByTestId('copy-link-button')).toBeInTheDocument();
      expect(screen.getByTestId('edit')).toBeInTheDocument();
    });

    it('shows copy link for admins', () => {
      const comment = buildComment();

      contextualRender(<CommentContextMenu close={() => {}} comment={comment} />, {
        appContext: { isAdmin: true },
      });

      expect(screen.getByTestId('copy-link-button')).toBeInTheDocument();
    });

    it('does not show copy link for hidden comments', () => {
      const comment = buildComment({ status: 'hidden' });

      contextualRender(<CommentContextMenu close={() => {}} comment={comment} />, {
        appContext: { isAdmin: true },
      });

      expect(screen.getByTestId('show-button')).toBeInTheDocument();
      expect(screen.queryByTestId('copy-link-button')).not.toBeInTheDocument();
    });

    it('copies a link to the comment and confirms it', async () => {
      const comment = buildComment();

      contextualRender(<CommentContextMenu close={() => {}} comment={comment} />, {
        appContext: { member: { uuid: 'viewer-uuid' } },
      });

      fireEvent.click(screen.getByTestId('copy-link-button'));

      await waitFor(() => {
        expect(screen.getByTestId('copy-link-button')).toHaveTextContent('Link copied');
      });

      const expectedUrl = new URL(window.location.href);
      expectedUrl.search = '';
      expectedUrl.hash = `ghost-comments-${comment.id}`;
      expect(writeText.calledOnceWith(expectedUrl.toString())).toBe(true);
    });

    it('closes the menu after copying', async () => {
      const clock = sinon.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const close = sinon.spy();
      const comment = buildComment();

      contextualRender(<CommentContextMenu close={close} comment={comment} />, {
        appContext: { member: { uuid: 'viewer-uuid' } },
      });

      fireEvent.click(screen.getByTestId('copy-link-button'));
      await clock.tickAsync(0);
      expect(close.called).toBe(false);

      await clock.tickAsync(1000);
      expect(close.calledOnce).toBe(true);
    });

    it('does not close the menu later if it was closed while copying', async () => {
      const clock = sinon.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      let finishCopy;
      writeText.returns(
        new Promise((resolve) => {
          finishCopy = resolve;
        }),
      );
      const close = sinon.spy();
      const comment = buildComment();

      const { unmount } = contextualRender(<CommentContextMenu close={close} comment={comment} />, {
        appContext: { member: { uuid: 'viewer-uuid' } },
      });

      fireEvent.click(screen.getByTestId('copy-link-button'));
      unmount();
      finishCopy();
      await clock.tickAsync(1000);

      expect(close.called).toBe(false);
    });

    it('tells the reader when the link could not be copied and keeps the menu open', async () => {
      const clock = sinon.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      writeText.rejects(new Error('Not allowed'));
      const close = sinon.spy();
      const comment = buildComment();

      contextualRender(<CommentContextMenu close={close} comment={comment} />, {
        appContext: { member: { uuid: 'viewer-uuid' } },
      });

      fireEvent.click(screen.getByTestId('copy-link-button'));
      await clock.tickAsync(1000);

      expect(screen.getByTestId('copy-link-button')).toHaveTextContent('Could not copy link');
      expect(close.called).toBe(false);
    });

    it('does not close the menu after a failed retry of a successful copy', async () => {
      const clock = sinon.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const close = sinon.spy();
      const comment = buildComment();

      contextualRender(<CommentContextMenu close={close} comment={comment} />, {
        appContext: { member: { uuid: 'viewer-uuid' } },
      });

      fireEvent.click(screen.getByTestId('copy-link-button'));
      await clock.tickAsync(0);
      writeText.rejects(new Error('Not allowed'));
      fireEvent.click(screen.getByTestId('copy-link-button'));
      await clock.tickAsync(1000);

      expect(screen.getByTestId('copy-link-button')).toHaveTextContent('Could not copy link');
      expect(close.called).toBe(false);
    });
  });
});
