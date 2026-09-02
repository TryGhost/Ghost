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
    const loaded = '<p><span style="white-space: pre-wrap;">A caption</span></p>';

    expect(normalizeCaptionHtml(loaded)).toBe(normalizeCaptionHtml('<p>A caption</p>'));
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
});
