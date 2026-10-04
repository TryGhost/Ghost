import { createElement } from 'react';
import { act, render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { useEditorScreenSessionKey } from './session-key';

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
  return { navigate, back, created, key: () => key };
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

  it('gives a new key when the new-post URL is reached after a create whose URL replace never rendered', async () => {
    const screen = renderScreen('/editor/post');
    const created = screen.key();
    screen.created();

    // The router can render the create's URL replace and this navigation as one.
    await screen.navigate('/editor/post');

    expect(screen.key()).not.toBe(created);
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
