import React from 'react';
import { RouterProvider, createHashRouter, createMemoryRouter } from 'react-router';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  hashPathname,
  installHistoryPopGate,
  restoredState,
} from './use-history-pop-navigation-guard';
import { useUnsavedChangesGuard } from './use-unsaved-changes-guard';
import type {
  UnsavedChangesGuard,
  UseUnsavedChangesGuardOptions,
} from './use-unsaved-changes-guard';

let latestGuard!: UnsavedChangesGuard;
let setOptions!: (options: UseUnsavedChangesGuardOptions) => void;

const GuardedScreen: React.FC<{ initialOptions: UseUnsavedChangesGuardOptions }> = ({
  initialOptions,
}) => {
  const [options, set] = React.useState(initialOptions);
  setOptions = set;
  latestGuard = useUnsavedChangesGuard(options);
  return (
    <div>
      <span data-testid="dialog-open">{String(latestGuard.dialogProps.open)}</span>
      <a href="#/ember-route">Ember link</a>
    </div>
  );
};

const renderGuarded = (
  options: UseUnsavedChangesGuardOptions,
  {
    initialEntries = ['/guarded'],
    initialIndex,
  }: { initialEntries?: string[]; initialIndex?: number } = {},
) => {
  const router = createMemoryRouter(
    [
      { path: '/guarded', element: <GuardedScreen initialOptions={options} /> },
      { path: '/elsewhere', element: <div data-testid="elsewhere" /> },
    ],
    { initialEntries, initialIndex },
  );
  render(<RouterProvider router={router} />);
  return router;
};

const dialogOpen = () => screen.getByTestId('dialog-open').textContent;

describe('useUnsavedChangesGuard', () => {
  beforeEach(() => {
    // The admin's data router stamps its index onto every entry it
    // creates; the memory router used here never touches window.history,
    // so mirror that stamp for the untracked-POP check.
    window.history.replaceState({ idx: 0 }, '', '/');
  });

  it('lets a clean screen navigate away without blocking', async () => {
    const router = renderGuarded({ when: false });

    await act(async () => {
      await router.navigate('/elsewhere');
    });

    expect(router.state.location.pathname).toBe('/elsewhere');
    expect(screen.getByTestId('elsewhere')).toBeInTheDocument();
  });

  it('blocks a router navigation while dirty and opens the discard dialog', async () => {
    const router = renderGuarded({ when: true });

    await act(async () => {
      await router.navigate('/elsewhere');
    });

    expect(router.state.location.pathname).toBe('/guarded');
    expect(latestGuard.isBlocked).toBe(true);
    expect(dialogOpen()).toBe('true');
  });

  it('proceeds when confirmed, surviving the dialog auto-close that follows', async () => {
    const router = renderGuarded({ when: true });
    await act(async () => {
      await router.navigate('/elsewhere');
    });

    act(() => {
      latestGuard.dialogProps.onConfirm();
      // DirtyConfirmDialog's confirm action auto-closes the dialog.
      latestGuard.dialogProps.onOpenChange(false);
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/elsewhere');
    });
  });

  it('stays and re-arms when the dialog is cancelled', async () => {
    const router = renderGuarded({ when: true });
    await act(async () => {
      await router.navigate('/elsewhere');
    });

    act(() => {
      latestGuard.dialogProps.onOpenChange(false);
    });

    expect(router.state.location.pathname).toBe('/guarded');
    expect(dialogOpen()).toBe('false');

    await act(async () => {
      await router.navigate('/elsewhere');
    });

    expect(router.state.location.pathname).toBe('/guarded');
    expect(dialogOpen()).toBe('true');
  });

  it('lets the next programmatic navigation through after bypassNextNavigation', async () => {
    const router = renderGuarded({ when: true });

    await act(async () => {
      latestGuard.bypassNextNavigation();
      await router.navigate('/elsewhere');
    });

    expect(router.state.location.pathname).toBe('/elsewhere');
    expect(latestGuard.isBlocked).toBe(false);
  });

  it('consumes the bypass when the next navigation keeps the same pathname', async () => {
    const router = renderGuarded({
      when: true,
      interceptNavigation: ({ nextLocation }) => nextLocation.search === '?tab=preview',
    });

    await act(async () => {
      latestGuard.bypassNextNavigation();
      await router.navigate('/guarded?tab=preview');
    });
    expect(router.state.location.search).toBe('?tab=preview');
    expect(latestGuard.interceptedNavigation.isBlocked).toBe(false);

    await act(async () => {
      await router.navigate('/elsewhere');
    });

    expect(router.state.location.pathname).toBe('/guarded');
    expect(latestGuard.isBlocked).toBe(true);
    expect(dialogOpen()).toBe('true');
  });

  it('holds a navigation blocked during a save and resumes it once the save settles', async () => {
    const router = renderGuarded({ when: true, isSaving: true });
    await act(async () => {
      await router.navigate('/elsewhere');
    });

    expect(router.state.location.pathname).toBe('/guarded');
    // The save in flight suppresses the discard dialog.
    expect(dialogOpen()).toBe('false');

    let resumed = false;
    act(() => {
      resumed = latestGuard.resumeBlockedNavigationAfterSave();
    });
    expect(resumed).toBe(true);

    act(() => {
      setOptions({ when: false, isSaving: false });
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/elsewhere');
    });
  });

  it('reports no blocked navigation to resume when nothing was blocked', () => {
    renderGuarded({ when: true });

    expect(latestGuard.resumeBlockedNavigationAfterSave()).toBe(false);
  });

  it('hands intercepted navigations to the caller instead of the discard dialog', async () => {
    const router = renderGuarded({
      when: false,
      interceptNavigation: ({ nextLocation }) => nextLocation.search === '?claimed',
    });

    await act(async () => {
      await router.navigate('/elsewhere?claimed');
    });

    expect(router.state.location.pathname).toBe('/guarded');
    expect(latestGuard.interceptedNavigation.isBlocked).toBe(true);
    expect(latestGuard.isBlocked).toBe(false);
    expect(dialogOpen()).toBe('false');

    act(() => {
      latestGuard.interceptedNavigation.reset();
    });
    expect(router.state.location.pathname).toBe('/guarded');
    expect(latestGuard.interceptedNavigation.isBlocked).toBe(false);

    await act(async () => {
      await router.navigate('/elsewhere?claimed');
    });
    act(() => {
      latestGuard.interceptedNavigation.proceed();
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/elsewhere');
    });
  });

  it('blocks a POP on a router-created entry but lets an untracked POP through', async () => {
    const router = renderGuarded(
      { when: true },
      { initialEntries: ['/elsewhere', '/guarded'], initialIndex: 1 },
    );

    await act(async () => {
      await router.navigate(-1);
    });
    expect(router.state.location.pathname).toBe('/guarded');
    expect(dialogOpen()).toBe('true');

    act(() => {
      latestGuard.dialogProps.onOpenChange(false);
    });

    // Native hash navigations do not carry the router's history index; a
    // POP from such an entry cannot be undone safely, so it passes.
    window.history.replaceState({}, '');
    await act(async () => {
      await router.navigate(-1);
    });
    expect(router.state.location.pathname).toBe('/elsewhere');
  });

  it('intercepts raw hash-anchor clicks and performs them on confirm', () => {
    renderGuarded({ when: true });

    fireEvent.click(screen.getByText('Ember link'));

    expect(latestGuard.isBlocked).toBe(true);
    expect(dialogOpen()).toBe('true');

    act(() => {
      latestGuard.dialogProps.onConfirm();
      latestGuard.dialogProps.onOpenChange(false);
    });

    expect(window.location.hash).toBe('#/ember-route');
  });
});

describe('useUnsavedChangesGuard with guardHistoryPops', () => {
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

  // The memory router ignores window history, so the window mirrors its entry
  // after one the router did not create.
  beforeEach(() => {
    window.history.replaceState(null, '', '#/elsewhere');
    window.history.pushState(null, '', '#/guarded');
  });

  const traverse = async (move: () => void, target: string) => {
    const before = reached.length;
    move();
    await waitFor(() => expect(reached.slice(before)).toContain(target));
  };
  const popBack = (target = '#/elsewhere') => traverse(() => window.history.back(), target);
  const popForward = (target: string) => traverse(() => window.history.forward(), target);

  it('holds a pop out of the screen at its URL, then completes it on confirm', async () => {
    renderGuarded({ when: true, guardHistoryPops: true });

    await popBack();

    expect(window.location.hash).toBe('#/guarded');
    expect(dialogOpen()).toBe('true');

    act(() => {
      latestGuard.dialogProps.onConfirm();
      latestGuard.dialogProps.onOpenChange(false);
    });

    await waitFor(() => expect(window.location.hash).toBe('#/elsewhere'));
  });

  it('stays on cancel and holds the next pop again', async () => {
    renderGuarded({ when: true, guardHistoryPops: true });
    await popBack();

    act(() => {
      latestGuard.dialogProps.onOpenChange(false);
    });
    expect(dialogOpen()).toBe('false');
    expect(window.location.hash).toBe('#/guarded');

    await popBack();

    expect(window.location.hash).toBe('#/guarded');
    expect(dialogOpen()).toBe('true');
  });

  it('hides a held pop from the listeners that come after the gate', async () => {
    const seen: string[] = [];
    const onPop = () => seen.push(`popstate ${window.location.hash}`);
    const onHashChange = (event: HashChangeEvent) =>
      seen.push(`hashchange ${new URL(event.newURL).hash}`);
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onHashChange);
    try {
      renderGuarded({ when: true, guardHistoryPops: true });
      await popBack();
      expect(seen).toEqual([]);

      act(() => {
        latestGuard.dialogProps.onConfirm();
      });

      await waitFor(() => expect(seen).toEqual(['popstate #/elsewhere', 'hashchange #/elsewhere']));
    } finally {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onHashChange);
    }
  });

  it('hides a held pop from capture listeners added after the gate', async () => {
    const seen: string[] = [];
    const onPop = () => seen.push(window.location.hash);
    window.addEventListener('popstate', onPop, { capture: true });
    try {
      renderGuarded({ when: true, guardHistoryPops: true });

      await popBack();

      expect(seen).toEqual([]);
    } finally {
      window.removeEventListener('popstate', onPop, { capture: true });
    }
  });

  it('forgets the URL of a held pop once a pop goes through', async () => {
    const heard: string[] = [];
    const onHashChange = (event: HashChangeEvent) => heard.push(new URL(event.newURL).hash);
    window.addEventListener('hashchange', onHashChange);
    try {
      renderGuarded({ when: true, guardHistoryPops: true });
      // A held pop whose hash change never follows, as when the URL is back on it first.
      window.history.pushState(null, '', '#/elsewhere');
      act(() => {
        window.dispatchEvent(new PopStateEvent('popstate'));
      });
      expect(window.location.hash).toBe('#/guarded');
      act(() => {
        latestGuard.dialogProps.onOpenChange(false);
        setOptions({ when: false, guardHistoryPops: true });
      });

      window.location.hash = '/elsewhere';
      window.location.hash = '/third';

      await waitFor(() => expect(heard).toEqual(['#/elsewhere', '#/third']));
    } finally {
      window.removeEventListener('hashchange', onHashChange);
    }
  });

  it("puts the screen's own entry back above the entry the pop reached", async () => {
    window.history.replaceState({ key: 'before', idx: 3 }, '', '#/elsewhere');
    window.history.pushState({ usr: { from: 'list' }, key: 'screen', idx: 4 }, '', '#/guarded');
    renderGuarded({ when: true, guardHistoryPops: true });

    await popBack();

    expect(window.location.hash).toBe('#/guarded');
    expect(window.history.state).toEqual({ usr: { from: 'list' }, key: 'screen', idx: 4 });
  });

  it('keeps the destination of an exit that is already awaiting a decision', async () => {
    const router = renderGuarded({ when: true, guardHistoryPops: true });
    await act(async () => {
      await router.navigate('/elsewhere');
    });
    expect(dialogOpen()).toBe('true');

    await popBack();
    expect(window.location.hash).toBe('#/guarded');

    act(() => {
      latestGuard.dialogProps.onConfirm();
      latestGuard.dialogProps.onOpenChange(false);
    });

    await waitFor(() => expect(router.state.location.pathname).toBe('/elsewhere'));
    expect(window.location.hash).toBe('#/guarded');
  });

  it('keeps where a held Back leaves for when the hash is written before the decision', async () => {
    renderGuarded({ when: true, guardHistoryPops: true });
    await popBack();
    await traverse(() => {
      window.location.hash = '/third';
    }, '#/third');
    expect(window.location.hash).toBe('#/guarded');

    act(() => {
      latestGuard.dialogProps.onConfirm();
      latestGuard.dialogProps.onOpenChange(false);
    });

    await waitFor(() => expect(window.location.hash).toBe('#/elsewhere'));
  });

  it('keeps a held exit when the URL only drops its trailing slash before the decision', async () => {
    let screenGuard!: UnsavedChangesGuard;
    function Screen() {
      screenGuard = useUnsavedChangesGuard({ when: true, guardHistoryPops: true });
      return null;
    }
    window.history.replaceState(null, '', '#/guarded/');
    const router = createHashRouter([
      { path: '/guarded', element: <Screen /> },
      { path: '/elsewhere', element: null },
    ]);
    render(<RouterProvider router={router} />);
    try {
      await act(async () => {
        await router.navigate('/elsewhere');
      });
      await traverse(() => window.location.replace('#/guarded'), '#/guarded');

      expect(screenGuard.isBlocked).toBe(true);
      act(() => {
        screenGuard.dialogProps.onConfirm();
        screenGuard.dialogProps.onOpenChange(false);
      });
      await waitFor(() => expect(router.state.location.pathname).toBe('/elsewhere'));
    } finally {
      router.dispose();
    }
  });

  it('lets through the hash change of an anchor exit the writer confirmed', async () => {
    renderGuarded({ when: true, guardHistoryPops: true });
    fireEvent.click(screen.getByText('Ember link'));
    const before = reached.length;

    await act(async () => {
      latestGuard.dialogProps.onConfirm();
      latestGuard.dialogProps.onOpenChange(false);
      await waitFor(() => expect(reached.slice(before)).toContain('#/ember-route'));
    });

    expect(window.location.hash).toBe('#/ember-route');
    expect(dialogOpen()).toBe('false');
  });

  it('lets pops through while there is nothing to lose', async () => {
    renderGuarded({ when: false, guardHistoryPops: true });

    await popBack();

    expect(window.location.hash).toBe('#/elsewhere');
    expect(dialogOpen()).toBe('false');
  });

  it('lets a pop that keeps the pathname through', async () => {
    window.history.replaceState(null, '', '#/guarded?tab=first');
    window.history.pushState(null, '', '#/guarded');
    renderGuarded({ when: true, guardHistoryPops: true });

    await popBack('#/guarded?tab=first');

    expect(window.location.hash).toBe('#/guarded?tab=first');
    expect(dialogOpen()).toBe('false');
  });

  it('lets a pop that only drops the trailing slash through', async () => {
    window.history.replaceState(null, '', '#/guarded');
    window.history.pushState(null, '', '#/guarded/');
    renderGuarded({ when: true, guardHistoryPops: true }, { initialEntries: ['/guarded/'] });

    await popBack('#/guarded');

    expect(window.location.hash).toBe('#/guarded');
    expect(dialogOpen()).toBe('false');
  });

  it('leaves pops alone without the option', async () => {
    renderGuarded({ when: true });

    await popBack();

    expect(window.location.hash).toBe('#/elsewhere');
    expect(dialogOpen()).toBe('false');
  });

  it('does not block a pop to the same screen without its trailing slash', async () => {
    let screenGuard!: { guard: UnsavedChangesGuard; setWhen: (when: boolean) => void };
    function Screen() {
      const [when, setWhen] = React.useState(false);
      screenGuard = { guard: useUnsavedChangesGuard({ when, guardHistoryPops: true }), setWhen };
      return null;
    }
    window.history.replaceState(null, '', '#/guarded');
    const router = createHashRouter([{ path: '/guarded', element: <Screen /> }]);
    render(<RouterProvider router={router} />);
    const go = vi.spyOn(window.history, 'go').mockImplementation(() => {});
    try {
      await traverse(() => {
        window.location.hash = '/guarded/';
      }, '#/guarded/');
      await waitFor(() => expect(router.state.location.pathname).toBe('/guarded/'));
      act(() => screenGuard.setWhen(true));

      await popBack('#/guarded');

      await waitFor(() => expect(router.state.location.pathname).toBe('/guarded'));
      expect(go).not.toHaveBeenCalled();
      expect(screenGuard.guard.isBlocked).toBe(false);
    } finally {
      go.mockRestore();
      router.dispose();
    }
  });

  it('leaves the router able to undo a later pop onto the entry a cancelled Forward restored', async () => {
    const screens: Record<
      string,
      { guard: UnsavedChangesGuard; setWhen: (when: boolean) => void }
    > = {};
    function Screen({ name, guardHistoryPops }: { name: string; guardHistoryPops?: boolean }) {
      const [when, setWhen] = React.useState(false);
      screens[name] = { guard: useUnsavedChangesGuard({ when, guardHistoryPops }), setWhen };
      return null;
    }
    window.history.replaceState(null, '', '#/start');
    const router = createHashRouter([
      { path: '/start', element: null },
      { path: '/editor', element: <Screen name="editor" guardHistoryPops /> },
      { path: '/tag', element: <Screen name="tag" /> },
    ]);
    render(<RouterProvider router={router} />);
    try {
      await act(async () => {
        await router.navigate('/editor');
      });
      const editorState: unknown = window.history.state;
      await act(async () => {
        await router.navigate('/tag');
      });
      await popBack('#/editor');
      await waitFor(() => expect(router.state.location.pathname).toBe('/editor'));
      act(() => screens.editor.setWhen(true));

      await popForward('#/tag');
      expect(window.location.hash).toBe('#/editor');
      expect(window.history.state).toEqual({ ...(editorState as object), idx: 3 });
      act(() => {
        screens.editor.guard.dialogProps.onOpenChange(false);
        screens.editor.setWhen(false);
      });

      await popBack('#/tag');
      await waitFor(() => expect(router.state.location.pathname).toBe('/tag'));
      act(() => screens.tag.setWhen(true));

      await popForward('#/editor');

      await waitFor(() => expect(window.location.hash).toBe('#/tag'));
      expect(screens.tag.guard.dialogProps.open).toBe(true);
      act(() => {
        screens.tag.guard.dialogProps.onConfirm();
        screens.tag.guard.dialogProps.onOpenChange(false);
      });
      await waitFor(() => expect(router.state.location.pathname).toBe('/editor'));
      expect(window.location.hash).toBe('#/editor');
    } finally {
      router.dispose();
    }
  });
});

describe('restoredState', () => {
  const screenState = { usr: { from: 'list' }, key: 'screen', idx: 4 };

  it.each([
    ['a Back reached', { idx: 3 }, screenState],
    ['a Forward reached', { idx: 5 }, { ...screenState, idx: 6 }],
  ])('sits directly above the entry %s', (_move, reachedState, restored) => {
    expect(restoredState(screenState, reachedState)).toEqual(restored);
  });

  it('keeps its own index when the entry reached has none', () => {
    expect(restoredState(screenState, null)).toEqual(screenState);
  });

  it('keeps a state that has no router index', () => {
    expect(restoredState(null, { idx: 3 })).toBeNull();
  });
});

describe('hashPathname', () => {
  it.each([
    ['#/editor/post/abc', '/editor/post/abc'],
    ['#/posts?type=draft', '/posts'],
    ['#/posts/#section', '/posts/'],
    ['#posts', '/posts'],
    ['', '/'],
  ])('reads %s as %s', (hash, pathname) => {
    expect(hashPathname(hash)).toBe(pathname);
  });
});
