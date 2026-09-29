import { createElement, useState } from 'react';
import { flushSync } from 'react-dom';
import { act, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { deferred } from '@/utils/deferred';
import { useEditorLeaveGuard, type EditorLeaveGuard } from './use-leave-guard';
import type { EditorSessionHandle } from './use-editor-session';

describe('useEditorLeaveGuard', () => {
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
});
