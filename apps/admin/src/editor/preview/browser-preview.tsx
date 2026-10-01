import { EmptyIndicator, PreviewChrome } from '@tryghost/shade/components';
import { Box } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import {
  postPreviewBrowser,
  postPreviewBrowserFrame,
  postPreviewUnavailable,
} from '@tryghost/test-data/selectors/editor';
import { useEffect, useRef, type SyntheticEvent } from 'react';

import { browserPreviewUrl, type PreviewAudience, type PreviewDevice } from './preview-url';

interface BrowserPreviewProps {
  /** The post's public preview URL, before the audience params are applied. */
  previewUrl: string;
  audience: PreviewAudience;
  device: PreviewDevice;
  /** Called for an Escape pressed inside a same-origin site frame. */
  onEscape: () => void;
}

/** Keydowns inside the frame never reach the admin document, so listen on each page it loads. */
function useFrameEscape(onEscape: () => void) {
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;
  const detachRef = useRef<(() => void) | null>(null);

  useEffect(() => () => detachRef.current?.(), []);

  return (event: SyntheticEvent<HTMLIFrameElement>) => {
    detachRef.current?.();
    detachRef.current = null;

    const frameWindow = event.currentTarget.contentWindow;
    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === 'Escape') {
        onEscapeRef.current();
      }
    };

    try {
      frameWindow?.addEventListener('keydown', onKeyDown);
    } catch {
      // A cross-origin site frame cannot be observed.
      return;
    }
    detachRef.current = () => frameWindow?.removeEventListener('keydown', onKeyDown);
  };
}

export function BrowserPreview({ previewUrl, audience, device, onEscape }: BrowserPreviewProps) {
  const onFrameLoad = useFrameEscape(onEscape);

  if (!previewUrl) {
    return (
      <EmptyIndicator
        className="grow justify-center self-center"
        data-testid={postPreviewUnavailable}
        description="A post gets its preview link the first time it is saved."
        title="Nothing to preview yet"
      >
        <LucideIcon.Eye />
      </EmptyIndicator>
    );
  }

  const Frame = device === 'mobile' ? PreviewChrome : Box;

  return (
    <Frame
      className={device === 'desktop' ? 'size-full' : 'max-w-full shrink-0'}
      data-testid={postPreviewBrowser}
      {...(device === 'mobile' ? { device } : {})}
    >
      <iframe
        className="size-full border-0"
        data-testid={postPreviewBrowserFrame}
        src={browserPreviewUrl(previewUrl, audience)}
        title="Post preview"
        onLoad={onFrameLoad}
      />
    </Frame>
  );
}
