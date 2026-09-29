import { EmptyIndicator, PreviewChrome } from '@tryghost/shade/components';
import { Box } from '@tryghost/shade/primitives';
import { LucideIcon } from '@tryghost/shade/utils';
import {
  postPreviewBrowser,
  postPreviewBrowserFrame,
  postPreviewUnavailable,
} from '@tryghost/test-data/selectors/editor';

import { browserPreviewUrl, type PreviewAudience, type PreviewDevice } from './preview-url';

interface BrowserPreviewProps {
  /** The post's public preview URL, before the audience params are applied. */
  previewUrl: string;
  audience: PreviewAudience;
  device: PreviewDevice;
}

export function BrowserPreview({ previewUrl, audience, device }: BrowserPreviewProps) {
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
      />
    </Frame>
  );
}
