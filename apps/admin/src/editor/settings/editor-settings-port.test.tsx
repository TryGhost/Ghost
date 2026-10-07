import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { body, record } from '@/editor/session/__test-utils__/session-harness';
import { useEditorSession } from '@/editor/session/use-editor-session';
import { useEditorSettingsPort } from './editor-settings-port';

vi.mock('@tryghost/admin-x-framework', () => ({
  useLocation: () => ({ key: 'editor', state: null }),
}));

// The real hooks hand back one stable function per mount; a fresh mock per
// render would make the handle churn for a reason the hook does not own.
const stable = vi.hoisted(() => ({ fetchApi: vi.fn(), generateSlug: vi.fn() }));

vi.mock('@tryghost/admin-x-framework/hooks', () => ({
  useFetchApi: () => stable.fetchApi,
}));

vi.mock('@tryghost/admin-x-framework/api/config', () => ({
  useBrowseConfig: () => ({ data: undefined }),
}));

vi.mock('@tryghost/admin-x-framework/api/slugs', () => ({
  useGenerateSlug: () => stable.generateSlug,
}));

vi.mock('@tryghost/admin-x-framework/api/posts', () => ({
  useAddPost: () => ({ mutateAsync: vi.fn() }),
  useEditPost: () => ({ mutateAsync: vi.fn() }),
  useEditorPost: () => ({ data: undefined }),
  postsDataType: 'PostsResponseType',
}));

vi.mock('@tryghost/admin-x-framework/api/pages', () => ({
  useAddPage: () => ({ mutateAsync: vi.fn() }),
  useEditPage: () => ({ mutateAsync: vi.fn() }),
  useEditorPage: () => ({ data: undefined }),
  pagesDataType: 'PagesResponseType',
}));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

function Wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function setup() {
  return renderHook(
    () => {
      const session = useEditorSession({
        postType: 'post',
        record: record(),
        siteUrl: 'https://example.com',
      });
      return { session, port: useEditorSettingsPort(session) };
    },
    { wrapper: Wrapper },
  );
}

/**
 * The port is what the settings sections memoize on, so it has to move with the
 * members it carries rather than with everything the session publishes.
 */
describe('useEditorSettingsPort', () => {
  it('keeps the same port across a render that changed nothing', () => {
    const { result, rerender } = setup();
    const { port } = result.current;

    rerender();

    expect(result.current.port).toBe(port);
  });

  it('keeps the same port when a body edit moves the handle', () => {
    const { result } = setup();
    act(() => result.current.session.bind.onSecondaryChange(body('Hello')));

    const { session, port } = result.current;
    act(() => result.current.session.bind.onLexicalChange(body('Hello again')));

    expect(result.current.session).not.toBe(session);
    expect(result.current.session.isDirty()).toBe(true);
    expect(result.current.port).toBe(port);
  });

  it('replaces the port but not its binding when a settings field changes', () => {
    const { result } = setup();
    const { port } = result.current;

    act(() => result.current.port.stageSettings({ meta_title: 'A meta title' }));

    expect(result.current.port).not.toBe(port);
    expect(result.current.port.settings.meta_title).toBe('A meta title');
    expect(result.current.port.bind).toBe(port.bind);
  });

  it('replaces the port when the title changes, which the sections read', () => {
    const { result } = setup();
    const { port } = result.current;

    act(() => result.current.session.bind.onTitleChange('A new title'));

    expect(result.current.port).not.toBe(port);
    expect(result.current.port.bind.title).toBe('A new title');
  });
});
