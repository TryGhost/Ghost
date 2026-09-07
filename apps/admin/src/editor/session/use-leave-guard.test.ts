import { createElement } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { deferred } from '@/utils/deferred';
import { useEditorLeaveGuard, type EditorLeaveGuard } from './use-leave-guard';
import type { EditorSessionHandle } from './use-editor-session';

describe('useEditorLeaveGuard', () => {
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
