import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { PostCardConfig, PostType } from './card-config';
import type { FeatureImageBinding } from './session/feature-image-binding';
import { PostEditor } from './post-editor';

// Counted once per render of a composer subtree, which is how many times the
// hidden and the visible instance rebuild between them.
const composerRendered = vi.hoisted(() => vi.fn());

vi.mock('@/settings/components/koenig-loader', () => {
  const stub = {
    KoenigComposer: ({ children }: { children: ReactNode }) => {
      composerRendered();
      return <div>{children}</div>;
    },
    KoenigEditor: () => null,
    WordCountPlugin: () => null,
    TKCountPlugin: () => null,
  };
  const resource = { read: () => stub };
  return { loadKoenig: () => resource };
});

vi.mock('@tryghost/shade/app', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useFocusContext: () => ({ darkMode: false }),
}));

vi.mock('@tryghost/admin-x-framework/api/images', () => ({
  getImageUrl: () => '',
  useUploadImage: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const CARD_CONFIG = { siteUrl: 'https://example.com' } as unknown as PostCardConfig;

const NOOP = () => {};

const FEATURE_IMAGE: FeatureImageBinding = {
  featureImage: null,
  featureImageAlt: null,
  featureImageCaption: null,
  onFeatureImageChange: NOOP,
  onFeatureImageClear: NOOP,
  onFeatureImageAltChange: NOOP,
  onFeatureImageCaptionChange: NOOP,
  onFeatureImageCaptionBlur: NOOP,
};

/**
 * The editor surface as the screen mounts it, over a title the surface owns:
 * typing into it re-renders everything the body's props are built in.
 */
function Harness({ postType }: { postType: PostType }) {
  const [title, setTitle] = useState('');

  return (
    <PostEditor
      cardConfig={CARD_CONFIG}
      excerpt=""
      featureImage={FEATURE_IMAGE}
      initialLexical={null}
      postType={postType}
      showExcerpt={false}
      title={title}
      onExcerptChange={NOOP}
      onTitleChange={setTitle}
    />
  );
}

describe('KoenigPostEditor re-renders', () => {
  it('does not rebuild its composers when the title is typed into', () => {
    const { rerender } = render(<Harness postType="post" />);
    const title = screen.getByTestId('editor-title-input');

    expect(composerRendered).toHaveBeenCalledTimes(2);

    fireEvent.change(title, { target: { value: 'A' } });
    fireEvent.change(title, { target: { value: 'A t' } });

    expect(composerRendered).toHaveBeenCalledTimes(2);

    // The count moves for a prop the body actually reads, so it is the memo
    // holding it still rather than the probe missing renders.
    rerender(<Harness postType="page" />);

    expect(composerRendered).toHaveBeenCalledTimes(4);
  });
});
