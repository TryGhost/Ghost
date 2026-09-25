import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { dispatchedIntents } from './__test-utils__/save-engine-spy';
import { record } from './__test-utils__/session-harness';
import type { EditorRecord } from './projection';
import { useEditorSession } from './use-editor-session';

type SaveEngineModule = typeof import('@/editor/engine/save-engine');

vi.mock('@/editor/engine/save-engine', async (importOriginal) => {
  const spy = await import('@/editor/session/__test-utils__/save-engine-spy');
  return spy.spiedSaveEngine(await importOriginal<SaveEngineModule>());
});

beforeEach(() => {
  dispatchedIntents.length = 0;
});

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

function setup(loaded: EditorRecord = record()) {
  return renderHook(
    () =>
      useEditorSession({
        postType: 'post',
        record: loaded,
        siteUrl: 'https://example.com',
      }),
    { wrapper: Wrapper },
  );
}

/**
 * The handle is what every editor component memoizes on, so its identity has to
 * track the values it carries rather than the render that produced it.
 */
describe('useEditorSession handle identity', () => {
  it('keeps the same handle across a render that changed nothing', () => {
    const { result, rerender } = setup();
    const handle = result.current;

    rerender();

    expect(result.current).toBe(handle);
  });

  it('replaces the handle when a settings field changes', () => {
    const { result } = setup();
    const handle = result.current;

    act(() => result.current.stageSettings({ meta_title: 'A meta title' }));

    expect(result.current).not.toBe(handle);
    expect(result.current.settings.meta_title).toBe('A meta title');
  });

  it('keeps the same bind across a render and across an unrelated settings change', () => {
    const { result, rerender } = setup();
    const { bind } = result.current;

    rerender();
    expect(result.current.bind).toBe(bind);

    const handle = result.current;
    act(() => result.current.stageSettings({ meta_description: 'A meta description' }));

    expect(result.current).not.toBe(handle);
    expect(result.current.bind).toBe(bind);
  });

  it('keeps isDirty stable while the view does not change', () => {
    const { result, rerender } = setup();
    const { isDirty } = result.current;

    rerender();

    expect(result.current.isDirty).toBe(isDirty);
    expect(result.current.isDirty()).toBe(false);
  });

  it('reads the dirtiness the view holds now, not the one it was created with', () => {
    const { result } = setup();
    const { isDirty } = result.current;

    act(() => result.current.bind.onTitleChange('A new title'));

    expect(result.current.isDirty()).toBe(true);
    expect(result.current.isDirty).not.toBe(isDirty);
  });
});

describe('useEditorSession title blur', () => {
  it('commits a draft title as a field save', () => {
    const { result } = setup();

    act(() => result.current.bind.onTitleChange('A new title'));
    act(() => result.current.bind.onTitleBlur());

    expect(dispatchedIntents).toEqual(['field']);
  });

  it('stages a published title until an explicit save', () => {
    const { result } = setup(
      record({ status: 'published', published_at: '2025-12-01T00:00:00.000Z' }),
    );

    act(() => result.current.bind.onTitleChange('A new title'));
    act(() => result.current.bind.onTitleBlur());

    expect(result.current.pendingSave).toMatchObject({ blockedBy: null });
    expect(result.current.isDirty()).toBe(true);
  });

  it('keeps a draft title staged while an emptied author list is staged', async () => {
    const { result } = setup(record({ authors: [{ id: 'author-1' }] }));

    act(() => result.current.editSettings({ authors: [] }));
    act(() => result.current.bind.onTitleChange('A new title'));
    act(() => result.current.bind.onTitleBlur());

    await waitFor(() =>
      expect(result.current.pendingSave).toMatchObject({ blockedBy: { kind: 'validation' } }),
    );
  });
});
