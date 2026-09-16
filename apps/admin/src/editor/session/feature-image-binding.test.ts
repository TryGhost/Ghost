import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { EditorRecord } from './projection';
import {
  cleanCaptionHtml,
  normalizeCaptionHtml,
  useFeatureImageBinding,
  withCaptionParagraph,
} from './feature-image-binding';

function port() {
  return { patchFeatureImage: vi.fn(), dispatchField: vi.fn() };
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
    expect(session.dispatchField).toHaveBeenCalledTimes(1);
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
    expect(session.dispatchField).toHaveBeenCalledTimes(1);
    expect(result.current.featureImageCaption).toBeNull();
  });

  it('saves alt text as it is typed', () => {
    const session = port();
    const { result } = renderHook(() => useFeatureImageBinding(session, record()));

    act(() => result.current.onFeatureImageAltChange('A field of grass'));

    expect(session.patchFeatureImage).toHaveBeenCalledWith({
      feature_image_alt: 'A field of grass',
    });
    expect(session.dispatchField).toHaveBeenCalledTimes(1);
  });

  it('holds the caption until it loses focus', () => {
    const session = port();
    const { result } = renderHook(() => useFeatureImageBinding(session, record()));

    act(() => result.current.onFeatureImageCaptionChange('<p>A caption</p>'));

    expect(session.patchFeatureImage).toHaveBeenCalledWith({ feature_image_caption: 'A caption' });
    expect(session.dispatchField).not.toHaveBeenCalled();

    act(() => result.current.onFeatureImageCaptionBlur());

    expect(session.dispatchField).toHaveBeenCalledTimes(1);
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
