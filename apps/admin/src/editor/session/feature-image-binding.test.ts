import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { dispatchedIntents } from '@/editor/session/__test-utils__/save-engine-spy';
import {
  record as sessionRecord,
  sessionHarness,
} from '@/editor/session/__test-utils__/session-harness';
import type { EditorRecord } from './projection';
import {
  cleanCaptionHtml,
  normalizeCaptionHtml,
  useFeatureImageBinding,
  withCaptionParagraph,
} from './feature-image-binding';

type SaveEngineModule = typeof import('@/editor/engine/save-engine');

vi.mock('@/editor/engine/save-engine', async (importOriginal) => {
  const spy = await import('@/editor/session/__test-utils__/save-engine-spy');
  return spy.spiedSaveEngine(await importOriginal<SaveEngineModule>());
});

beforeEach(() => {
  dispatchedIntents.length = 0;
});

function port() {
  return { patchFeatureImage: vi.fn(), commitSettings: vi.fn() };
}

function record(overrides: Partial<EditorRecord> = {}): EditorRecord {
  return {
    id: 'post-1',
    url: 'https://example.com/post-1/',
    slug: 'post-1',
    title: 'Post',
    updated_at: '2026-09-02T12:00:00.000Z',
    ...overrides,
  } as EditorRecord;
}

describe('caption html', () => {
  it('stores the paragraph content, not the paragraph', () => {
    expect(cleanCaptionHtml('<p>A <strong>caption</strong></p>')).toBe(
      'A <strong>caption</strong>',
    );
  });

  it('gives a stored caption its paragraph back for the editor', () => {
    expect(withCaptionParagraph('A caption')).toBe('<p>A caption</p>');
    expect(withCaptionParagraph('<p>A caption</p>')).toBe('<p>A caption</p>');
    expect(withCaptionParagraph(null)).toBeNull();
  });

  it('ignores the wrapper spans Lexical adds on load', () => {
    // The shape the editor actually emits for a stored plain-text caption.
    const loaded = '<p dir="ltr"><span style="white-space: pre-wrap;">A caption</span></p>';

    expect(normalizeCaptionHtml(loaded)).toBe('A caption');
    expect(normalizeCaptionHtml(loaded)).toBe(normalizeCaptionHtml('A caption'));
  });

  it('keeps a span that carries anything of its own', () => {
    expect(normalizeCaptionHtml('<p><span class="x">A caption</span></p>')).toBe(
      '<span class="x">A caption</span>',
    );
    expect(
      normalizeCaptionHtml(
        '<p><span style="white-space: pre-wrap; color: red">A caption</span></p>',
      ),
    ).toContain('span');
  });

  it('keeps a caption with markup whole on both sides of the compare', () => {
    expect(normalizeCaptionHtml('<p>Photo by <a href="/j">Jane</a></p>')).toBe(
      'Photo by <a href="/j">Jane</a>',
    );
    expect(normalizeCaptionHtml('Photo by <a href="/j">Jane</a>')).toBe(
      'Photo by <a href="/j">Jane</a>',
    );
  });

  it('separates markup captions that differ only outside their first element', () => {
    expect(normalizeCaptionHtml('<a href="/j">Jane</a> took this')).not.toBe(
      normalizeCaptionHtml('<a href="/j">Jane</a> shot this'),
    );
  });
});

describe('useFeatureImageBinding', () => {
  it('starts from the loaded post', () => {
    const { result } = renderHook(() =>
      useFeatureImageBinding(
        port(),
        record({
          feature_image: 'https://example.com/a.png',
          feature_image_alt: 'A',
          feature_image_caption: 'A caption',
        }),
      ),
    );

    expect(result.current.featureImage).toBe('https://example.com/a.png');
    expect(result.current.featureImageAlt).toBe('A');
    expect(result.current.featureImageCaption).toBe('<p>A caption</p>');
  });

  it('saves a new image straight away', () => {
    const session = port();
    const { result } = renderHook(() => useFeatureImageBinding(session, record()));

    act(() => result.current.onFeatureImageChange('https://example.com/a.png'));

    expect(session.patchFeatureImage).toHaveBeenCalledWith({
      feature_image: 'https://example.com/a.png',
    });
    expect(session.commitSettings).toHaveBeenCalledTimes(1);
    expect(result.current.featureImage).toBe('https://example.com/a.png');
  });

  it('clears the alt text and caption along with the image', () => {
    const session = port();
    const { result } = renderHook(() =>
      useFeatureImageBinding(
        session,
        record({
          feature_image: 'https://example.com/a.png',
          feature_image_alt: 'A',
          feature_image_caption: 'A caption',
        }),
      ),
    );

    act(() => result.current.onFeatureImageClear());

    expect(session.patchFeatureImage).toHaveBeenCalledWith({
      feature_image: null,
      feature_image_alt: null,
      feature_image_caption: null,
    });
    expect(session.commitSettings).toHaveBeenCalledTimes(1);
    expect(result.current.featureImageCaption).toBeNull();
  });

  it('saves alt text as it is typed', () => {
    const session = port();
    const { result } = renderHook(() => useFeatureImageBinding(session, record()));

    act(() => result.current.onFeatureImageAltChange('A field of grass'));

    expect(session.patchFeatureImage).toHaveBeenCalledWith({
      feature_image_alt: 'A field of grass',
    });
    expect(session.commitSettings).toHaveBeenCalledTimes(1);
  });

  it('holds the caption until it loses focus', () => {
    const session = port();
    const { result } = renderHook(() => useFeatureImageBinding(session, record()));

    act(() => result.current.onFeatureImageCaptionChange('<p>A caption</p>'));

    expect(session.patchFeatureImage).toHaveBeenCalledWith({ feature_image_caption: 'A caption' });
    expect(session.commitSettings).not.toHaveBeenCalled();

    act(() => result.current.onFeatureImageCaptionBlur());

    expect(session.commitSettings).toHaveBeenCalledTimes(1);
  });

  it('ignores a caption the editor only re-serialized', () => {
    const session = port();
    const { result } = renderHook(() =>
      useFeatureImageBinding(session, record({ feature_image_caption: 'A caption' })),
    );

    act(() =>
      result.current.onFeatureImageCaptionChange(
        '<p><span style="white-space: pre-wrap;">A caption</span></p>',
      ),
    );

    expect(session.patchFeatureImage).not.toHaveBeenCalled();
  });

  it('loads a caption with markup clean', () => {
    const session = port();
    const stored = 'Photo by <a href="/j">Jane</a>';
    const { result } = renderHook(() =>
      useFeatureImageBinding(session, record({ feature_image_caption: stored })),
    );

    act(() => result.current.onFeatureImageCaptionChange(`<p>${stored}</p>`));

    expect(session.patchFeatureImage).not.toHaveBeenCalled();
  });

  it('still sees an edit that changes only the text after a link', () => {
    const session = port();
    const { result } = renderHook(() =>
      useFeatureImageBinding(
        session,
        record({ feature_image_caption: '<a href="/j">Jane</a> took this' }),
      ),
    );

    act(() => result.current.onFeatureImageCaptionChange('<p><a href="/j">Jane</a> shot this</p>'));

    expect(session.patchFeatureImage).toHaveBeenCalledWith({
      feature_image_caption: '<a href="/j">Jane</a> shot this',
    });
  });
});

describe('useFeatureImageBinding through the session', () => {
  const IMAGE = 'https://example.com/a.png';
  // Whole seconds, as a saved publish time always is.
  const FUTURE = new Date(
    Math.floor(Date.now() / 1000) * 1000 + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // A field save awaits the slug port and the transport before it lands.
  const settle = () =>
    new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

  function bound(loaded: EditorRecord) {
    const harness = sessionHarness({ record: loaded });
    const { session } = harness;
    const { result } = renderHook(() =>
      useFeatureImageBinding(
        { patchFeatureImage: session.patchFeatureImage, commitSettings: session.commitField },
        loaded,
      ),
    );
    return { ...harness, result };
  }

  it('saves a new image on a draft as a field save', async () => {
    const { result, state } = bound(sessionRecord());

    act(() => result.current.onFeatureImageChange(IMAGE));
    await settle();

    expect(dispatchedIntents).toEqual(['field']);
    expect(state.updates[0].payload).toMatchObject({ feature_image: IMAGE });
  });

  it('keeps a new image on a draft staged while an emptied author list is staged', async () => {
    const { result, session, state } = bound(sessionRecord({ authors: [{ id: 'author-1' }] }));

    session.patchFields({ authors: [] });
    act(() => result.current.onFeatureImageChange(IMAGE));
    await settle();

    expect(session.getView().pendingSave).toMatchObject({ blockedBy: { kind: 'validation' } });
    expect(state.updates).toHaveLength(0);
    expect(session.getState().kind).not.toBe('error');
    expect(session.getFields().feature_image).toBe(IMAGE);
    expect(session.isDirty()).toBe(true);
  });

  it('saves a new image on a draft whose saved publish time is in the future', async () => {
    const { result, state } = bound(sessionRecord({ published_at: FUTURE }));

    act(() => result.current.onFeatureImageChange(IMAGE));
    await settle();

    expect(dispatchedIntents).toEqual(['field']);
    expect(state.updates).toHaveLength(1);
    expect(state.updates[0].payload).toMatchObject({ feature_image: IMAGE });
  });

  it('keeps a new image on a draft staged while a future publish time is staged', async () => {
    const { result, session, state } = bound(sessionRecord());

    session.editPublishedAt(FUTURE);
    act(() => result.current.onFeatureImageChange(IMAGE));
    await settle();

    expect(session.getView().pendingSave).toMatchObject({ blockedBy: { kind: 'validation' } });
    expect(state.updates).toHaveLength(0);
    expect(session.getState().kind).not.toBe('error');
    expect(session.isDirty()).toBe(true);
  });

  it('stages a new image on a published post until an explicit save', async () => {
    const { result, session, state } = bound(
      sessionRecord({ status: 'published', published_at: '2025-12-01T00:00:00.000Z' }),
    );

    act(() => result.current.onFeatureImageChange(IMAGE));
    act(() => result.current.onFeatureImageAltChange('A field of grass'));
    await settle();

    expect(session.getView().pendingSave).toMatchObject({ blockedBy: null });
    expect(state.updates).toHaveLength(0);
    expect(session.isDirty()).toBe(true);

    await session.dispatchExplicit();

    expect(state.updates).toHaveLength(1);
    expect(state.updates[0].payload).toMatchObject({
      feature_image: IMAGE,
      feature_image_alt: 'A field of grass',
    });
  });
});
