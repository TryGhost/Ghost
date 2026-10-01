import { createElement, lazy, Suspense, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { act, render, waitFor } from '@testing-library/react';
import { createHashRouter, createMemoryRouter, RouterProvider, useLocation } from 'react-router';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { installHistoryPopGate } from '@/hooks/use-history-pop-navigation-guard';
import { deferred } from '@/utils/deferred';
import { useEditorLeaveGuard, type EditorLeaveGuard } from './use-leave-guard';
import { useEditorSessionKey, type EditorSessionHandle } from './use-editor-session';

describe('useEditorLeaveGuard', () => {
  const reached: string[] = [];
  beforeAll(() => {
    // Ahead of the gate, so it also sees where the pops the gate holds went.
    window.addEventListener(
      'popstate',
      () => {
        reached.push(window.location.hash);
      },
      { capture: true },
    );
    installHistoryPopGate();
  });

  const traverse = async (move: () => void, target: string) => {
    const before = reached.length;
    move();
    await waitFor(() => expect(reached.slice(before)).toContain(target));
  };

  it.each(['proceed', 'confirm'] as const)(
    'settles a blocked exit (%s) when a create renders before the router',
    async (outcome) => {
      const decision = deferred<'proceed' | 'confirm'>();
      let guard!: EditorLeaveGuard;
      let acknowledgeCreate!: () => void;
      const leaveRequested = vi.fn(() => decision.promise);
      function Editor() {
        const [createdId, setCreatedId] = useState<string | null>(null);
        acknowledgeCreate = () => setCreatedId('new789');
        guard = useEditorLeaveGuard(
          {
            state: { kind: 'idle' },
            createdId,
            isDirty: () => !createdId,
            leaveRequested,
          } as unknown as EditorSessionHandle,
          'post',
        );
        return createElement('main', { 'data-testid': 'editor' });
      }
      const router = createMemoryRouter(
        [
          { path: '/editor/post/:id?', element: createElement(Editor) },
          { path: '/posts', element: 'Posts' },
        ],
        { initialEntries: ['/editor/post'] },
      );
      render(createElement(RouterProvider, { router }));
      act(() => {
        void router.navigate('/posts');
        // Session updates use an external store and can beat the router's transition.
        flushSync(acknowledgeCreate);
      });
      await act(async () => {
        decision.resolve(outcome);
        await decision.promise;
      });
      if (outcome === 'confirm') {
        await waitFor(() => expect(guard.dialogProps.open).toBe(true));
        expect(router.state.location.pathname).toBe('/editor/post');
        act(() => guard.dialogProps.onOpenChange(false));
        await waitFor(() => expect(router.state.location.pathname).toBe('/editor/post/new789'));
      } else {
        await waitFor(() => expect(router.state.location.pathname).toBe('/posts'));
      }
      router.dispose();
    },
  );

  it('keeps the confirmation open until a slow navigation unmounts the editor', async () => {
    const destination = deferred<null>();
    const session = {
      state: { kind: 'idle' },
      createdId: null,
      isDirty: () => true,
      leaveRequested: vi.fn().mockResolvedValue('confirm'),
    } as unknown as EditorSessionHandle;
    let guard!: EditorLeaveGuard;
    function Editor() {
      guard = useEditorLeaveGuard(session, 'post');
      return createElement('main', { 'data-testid': 'editor' });
    }
    const router = createMemoryRouter(
      [
        { path: '/editor/post/abc', element: createElement(Editor) },
        { path: '/posts', loader: () => destination.promise, element: 'Posts' },
      ],
      { initialEntries: ['/editor/post/abc'] },
    );
    const screen = render(createElement(RouterProvider, { router }));
    await act(async () => {
      await router.navigate('/posts');
    });
    await waitFor(() => expect(guard.dialogProps.open).toBe(true));

    act(() => {
      guard.dialogProps.onConfirm();
      // Radix closes its Action automatically after invoking onConfirm.
      guard.dialogProps.onOpenChange(false);
    });

    expect(router.state.navigation.state).toBe('loading');
    expect(screen.getByTestId('editor')).toBeInTheDocument();
    expect(guard.dialogProps.open).toBe(true);
    // Repeated clicks and Escape cannot cancel an already accepted exit.
    act(() => {
      guard.dialogProps.onConfirm();
      guard.dialogProps.onOpenChange(false);
    });
    expect(guard.dialogProps.open).toBe(true);

    await act(async () => {
      destination.resolve(null);
      await destination.promise;
    });
    await waitFor(() => expect(screen.queryByTestId('editor')).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/posts');
    router.dispose();
  });

  it.each(['confirm', 'proceed'] as const)(
    'keeps asking once an exit accepted by %s lands on the same mounted editor',
    async (firstDecision) => {
      const leaveRequested = vi.fn().mockResolvedValue('confirm');
      leaveRequested.mockResolvedValueOnce(firstDecision);
      const session = {
        state: { kind: 'idle' },
        createdId: null,
        isDirty: () => true,
        leaveRequested,
      } as unknown as EditorSessionHandle;
      let guard!: EditorLeaveGuard;
      let mounts = 0;
      function Editor() {
        guard = useEditorLeaveGuard(session, 'post');
        useEffect(() => {
          mounts += 1;
        }, []);
        return createElement('main');
      }
      // Keyed like the editor screen, so entries with the same session key share one editor.
      function EditorRoute() {
        return createElement(Editor, { key: useEditorSessionKey() });
      }
      window.history.replaceState(null, '', '#/editor/post/first');
      window.history.pushState(null, '', '#/posts');
      window.history.pushState(null, '', '#/editor/post/second');
      const router = createHashRouter([
        { path: '/editor/*', element: createElement(EditorRoute) },
        { path: '/posts', element: 'Posts' },
      ]);
      // Hash anchors leave their entries without a router index.
      window.history.replaceState(null, '');
      render(createElement(RouterProvider, { router }));
      try {
        await traverse(() => window.history.go(-2), '#/editor/post/first');
        if (firstDecision === 'confirm') {
          await waitFor(() => expect(guard.dialogProps.open).toBe(true));
          act(() => {
            guard.dialogProps.onConfirm();
            guard.dialogProps.onOpenChange(false);
          });
        }

        await waitFor(() => expect(router.state.location.pathname).toBe('/editor/post/first'));
        await waitFor(() => expect(guard.dialogProps.open).toBe(false));
        expect(mounts).toBe(1);

        await traverse(() => window.history.forward(), '#/editor/post/second');
        await waitFor(() => expect(guard.dialogProps.open).toBe(true));
        act(() => guard.dialogProps.onOpenChange(false));
        await waitFor(() => expect(guard.dialogProps.open).toBe(false));

        await traverse(() => window.history.back(), '#/editor/post/second');

        await waitFor(() => expect(guard.dialogProps.open).toBe(true));
        expect(leaveRequested).toHaveBeenCalledTimes(3);
      } finally {
        router.dispose();
      }
    },
  );

  it('holds the created URL when Back arrives before the router commits its replacement', async () => {
    const commit = deferred<void>();
    const Commit = lazy(() => commit.promise.then(() => ({ default: () => null })));
    let acknowledgeCreate!: () => void;
    let guard!: EditorLeaveGuard;
    const leaveRequested = vi.fn().mockResolvedValue('confirm');
    function Editor() {
      const [createdId, setCreatedId] = useState<string | null>(null);
      acknowledgeCreate = () => setCreatedId('new789');
      guard = useEditorLeaveGuard(
        {
          state: { kind: 'idle' },
          createdId,
          isDirty: () => true,
          leaveRequested,
        } as unknown as EditorSessionHandle,
        'post',
      );
      const location = useLocation();
      return createElement(
        'main',
        { 'data-testid': 'editor' },
        location.pathname,
        location.pathname === '/editor/post/new789' ? createElement(Commit) : null,
      );
    }
    window.history.replaceState(null, '', '#/posts');
    window.history.pushState(null, '', '#/editor/post');
    const router = createHashRouter([
      { path: '/editor/post/:id?', element: createElement(Editor) },
      { path: '/posts', element: 'Posts' },
    ]);
    const screen = render(
      createElement(Suspense, { fallback: 'Loading' }, createElement(RouterProvider, { router })),
    );
    try {
      act(() => acknowledgeCreate());
      await waitFor(() => expect(window.location.hash).toBe('#/editor/post/new789'));
      // The browser entry has changed, but the mounted guard still belongs to the old commit.
      expect(screen.getByTestId('editor').textContent).toBe('/editor/post');
      const createdEntry: unknown = window.history.state;

      await traverse(() => window.history.back(), '#/posts');

      expect(window.location.hash).toBe('#/editor/post/new789');
      expect(window.history.state).toEqual(createdEntry);
      await act(async () => {
        commit.resolve();
        await commit.promise;
      });
      await waitFor(() => expect(guard.dialogProps.open).toBe(true));
      act(() => guard.dialogProps.onOpenChange(false));
      expect(window.location.hash).toBe('#/editor/post/new789');

      await traverse(() => window.history.back(), '#/posts');
      await waitFor(() => expect(guard.dialogProps.open).toBe(true));
      act(() => guard.dialogProps.onConfirm());
      await waitFor(() => expect(window.location.hash).toBe('#/posts'));
      expect(leaveRequested).toHaveBeenCalledTimes(2);
    } finally {
      await act(async () => {
        commit.resolve();
        await commit.promise;
      });
      router.dispose();
    }
  });

  it('replaces the URL of a post created at its trailing-slash URL without asking to leave', async () => {
    const leaveRequested = vi.fn().mockResolvedValue('confirm');
    let acknowledgeCreate!: () => void;
    function Editor() {
      const [createdId, setCreatedId] = useState<string | null>(null);
      acknowledgeCreate = () => setCreatedId('new789');
      useEditorLeaveGuard(
        {
          state: { kind: 'idle' },
          createdId,
          isDirty: () => true,
          leaveRequested,
        } as unknown as EditorSessionHandle,
        'post',
      );
      return createElement('main');
    }
    const router = createMemoryRouter(
      [{ path: '/editor/post/:id?', element: createElement(Editor) }],
      { initialEntries: ['/editor/post/'] },
    );
    render(createElement(RouterProvider, { router }));
    try {
      act(() => acknowledgeCreate());

      await waitFor(() => expect(router.state.location.pathname).toBe('/editor/post/new789'));
      expect(leaveRequested).not.toHaveBeenCalled();
    } finally {
      router.dispose();
    }
  });
});
