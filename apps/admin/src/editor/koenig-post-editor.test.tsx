import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { editorBody, editorSecondaryInstance } from '@tryghost/test-data/selectors/editor';
import type { ReactNode } from 'react';
import type { PostCardConfig, PostType } from './card-config';
import type { FeatureImageBinding } from './session/feature-image-binding';
import { KoenigPostEditor } from './koenig-post-editor';
import { PostEditor } from './post-editor';

// Counted once per render of a composer subtree, which is how many times the
// hidden and the visible instance rebuild between them.
const composerRendered = vi.hoisted(() => vi.fn());
const editorRendered = vi.hoisted(() => vi.fn());

vi.mock('@/settings/components/koenig-loader', () => {
  const stub = {
    KoenigComposer: ({ children }: { children: ReactNode }) => {
      composerRendered();
      return <div>{children}</div>;
    },
    KoenigEditor: (props: { onChange?: unknown }) => {
      editorRendered(props);
      return null;
    },
    WordCountPlugin: () => null,
    TKCountPlugin: () => null,
  };
  const resource = { read: () => stub };
  return { loadKoenig: () => resource, loadedKoenigVersion: () => 'test' };
});

vi.mock('@tryghost/shade/app', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useFocusContext: () => ({ darkMode: false }),
}));

vi.mock('@tryghost/admin-x-framework/api/images', () => ({
  getImageUrl: () => '',
  useUploadImage: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

// Keeps the Pintura config and settings queries out of this unit, which has no QueryClient.
vi.mock('@/hooks/use-pintura-editor', () => ({
  usePinturaEditor: () => ({ isEnabled: false, isOpen: false, openEditor: () => {} }),
}));

const CARD_CONFIG = { siteUrl: 'https://example.com' } as unknown as PostCardConfig;

const NOOP = () => {};

const FEATURE_IMAGE: FeatureImageBinding = {
  featureImage: null,
  featureImageAlt: null,
  featureImageCaption: null,
  featureImageCaptionKey: 0,
  onFeatureImageChange: NOOP,
  onFeatureImageClear: NOOP,
  onFeatureImageAltChange: NOOP,
  onFeatureImageCaptionChange: NOOP,
  onFeatureImageCaptionFocus: NOOP,
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

describe('KoenigPostEditor hidden instance', () => {
  it('loses only the baseline when the hidden instance crashes', () => {
    const onSecondaryChange = vi.fn();
    const onSecondaryError = vi.fn();
    editorRendered.mockImplementation(({ onChange }: { onChange?: unknown }) => {
      if (onChange === onSecondaryChange) {
        throw new Error('hidden instance crashed');
      }
    });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(NOOP);

    render(
      <KoenigPostEditor
        cardConfig={CARD_CONFIG}
        darkMode={false}
        initialLexical={null}
        placeholder="Begin writing your post..."
        registerAPI={NOOP}
        onChange={NOOP}
        onSecondaryChange={onSecondaryChange}
        onSecondaryError={onSecondaryError}
        onTkCountChange={NOOP}
        onWordCountChange={NOOP}
      />,
    );

    expect(onSecondaryError).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId(editorBody)).toBeInTheDocument();
    expect(screen.queryByTestId(editorSecondaryInstance)).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    editorRendered.mockReset();
    consoleError.mockRestore();
  });
});
