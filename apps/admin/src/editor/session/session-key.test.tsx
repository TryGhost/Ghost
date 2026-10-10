import { createElement, lazy, Suspense, useLayoutEffect, useState } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { createHashRouter, createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { deferred } from '@/utils/deferred';
import {
  EditorSessionCreatedProvider,
  EditorSessionKeyProvider,
  useEditorScreenSessionKey,
} from './session-key';
import { useEditorLeaveGuard } from './use-leave-guard';
import type { EditorSessionHandle } from './use-editor-session';

const routers: Array<ReturnType<typeof createMemoryRouter>> = [];

afterEach(() => {
  routers.splice(0).forEach((router) => router.dispose());
});

function renderScreen(initialEntry: string) {
  let key = '';
  let markCreated = () => {};
  function Screen() {
    ({ key, markCreated } = useEditorScreenSessionKey());
    return null;
  }
  const router = createMemoryRouter([{ path: '/editor/*', element: createElement(Screen) }], {
    initialEntries: [initialEntry],
  });
  routers.push(router);
  render(createElement(RouterProvider, { router }));
  const navigate = async (...args: Parameters<typeof router.navigate>) => {
    await act(async () => {
      await router.navigate(...args);
    });
  };
  const back = async () => {
    await act(async () => {
      await router.navigate(-1);
    });
  };
  const created = () => {
    act(() => {
      markCreated();
    });
  };
  const revalidate = async () => {
    await act(async () => {
      await router.revalidate();
    });
  };
  return { navigate, back, created, revalidate, key: () => key };
}

describe('useEditorScreenSessionKey', () => {
  it('keeps the key while navigation stays on the post', async () => {
    const screen = renderScreen('/editor/post/abc');
    const opened = screen.key();

    await screen.navigate('/editor/post/abc/');
    await screen.navigate('/editor/post/abc?ref=list');

    expect(screen.key()).toBe(opened);
  });

  it('keeps the key on the id a create acquired, which its URL replace carries', async () => {
    const screen = renderScreen('/editor/post');
    const opened = screen.key();

    await screen.navigate('/editor/post/new1', {
      replace: true,
      state: { editorSession: opened },
    });
    expect(screen.key()).toBe(opened);

    await screen.navigate('/editor/post/new1/');
    expect(screen.key()).toBe(opened);
  });

  it('gives another post, a new one included, a new key', async () => {
    const screen = renderScreen('/editor/post/abc');
    const first = screen.key();

    await screen.navigate('/editor/post/other');
    const second = screen.key();
    await screen.navigate('/editor/post');

    expect(new Set([first, second, screen.key()]).size).toBe(3);
  });

  it('keeps a created post’s session when the router revalidates its committed URL', async () => {
    const screen = renderScreen('/editor/post');
    const created = screen.key();
    screen.created();
    expect(screen.key()).toBe(created);
    await screen.navigate('/editor/post/new1', {
      replace: true,
      state: { editorSession: created },
    });

    await screen.revalidate();

    expect(screen.key()).toBe(created);
  });

  it('gives a new key when the new-post URL is reached after a create whose URL replace never rendered', async () => {
    const screen = renderScreen('/editor/post');
    const created = screen.key();
    screen.created();
    expect(screen.key()).toBe(created);

    // The router can render the create's URL replace and this navigation as one.
    await screen.navigate('/editor/post');

    expect(screen.key()).not.toBe(created);
  });

  it('opens a fresh session when a native hash return coalesces with the created URL replacement', async () => {
    const previousHref = window.location.href;
    const previousState: unknown = window.history.state;
    const commit = deferred<void>();
    const Commit = lazy(() => commit.promise.then(() => ({ default: () => null })));
    let acknowledgeCreate!: () => void;
    let committedLocation!: ReturnType<typeof useLocation>;
    function Editor() {
      const [createdId, setCreatedId] = useState<string | null>(null);
      acknowledgeCreate = () => setCreatedId('new1');
      useEditorLeaveGuard(
        {
          state: { kind: 'idle' },
          createdId,
          isDirty: () => false,
          leaveRequested: () => Promise.resolve('proceed'),
        } as unknown as EditorSessionHandle,
        'post',
      );
      const location = useLocation();
      useLayoutEffect(() => {
        committedLocation = location;
      });
      return createElement(
        'main',
        { 'data-testid': 'editor' },
        createdId ? 'Created post' : 'New post',
        location.pathname === '/editor/post/new1' ? createElement(Commit) : null,
      );
    }
    function Screen() {
      const { key, markCreated } = useEditorScreenSessionKey();
      return createElement(
        EditorSessionKeyProvider,
        { value: key },
        createElement(
          EditorSessionCreatedProvider,
          { value: markCreated },
          createElement(Editor, { key }),
        ),
      );
    }
    window.history.replaceState(null, '', '#/editor/post');
    const router = createHashRouter([{ path: '/editor/*', element: createElement(Screen) }]);
    routers.push(router);
    const screen = render(
      createElement(Suspense, { fallback: 'Loading' }, createElement(RouterProvider, { router })),
    );
    const initialLocation = committedLocation;
    const originalEditor = screen.getByTestId('editor');
    try {
      act(() => acknowledgeCreate());
      await waitFor(() => expect(window.location.hash).toBe('#/editor/post/new1'));
      expect(committedLocation).toBe(initialLocation);
      expect(originalEditor).toHaveTextContent('Created post');

      await act(async () => {
        await router.revalidate();
      });
      expect(committedLocation).toBe(initialLocation);
      expect(originalEditor).toHaveTextContent('Created post');

      window.location.hash = '/editor/post';
      await waitFor(() => expect(router.state.location.pathname).toBe('/editor/post'));
      await waitFor(() => expect(screen.getByTestId('editor')).toHaveTextContent('New post'));
      expect(committedLocation).toBe(initialLocation);
      expect(originalEditor.isConnected).toBe(false);
      expect(window.location.hash).toBe('#/editor/post');
    } finally {
      await act(async () => {
        commit.resolve();
        await commit.promise;
      });
      router.dispose();
      window.history.replaceState(previousState, '', previousHref);
    }
  });

  it('keeps the key when the new-post URL is reached again before a create', async () => {
    const screen = renderScreen('/editor/post');
    const opened = screen.key();

    await screen.navigate('/editor/post');

    expect(screen.key()).toBe(opened);
  });

  it('gives a new key on Back to a created post from a new one', async () => {
    const screen = renderScreen('/editor/post');
    const created = screen.key();
    await screen.navigate('/editor/post/new1', {
      replace: true,
      state: { editorSession: created },
    });
    await screen.navigate('/editor/post');
    const fresh = screen.key();
    expect(fresh).not.toBe(created);

    await screen.back();

    expect(screen.key()).not.toBe(fresh);
  });
});
