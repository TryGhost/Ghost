import { EmptyIndicator, PreviewChrome } from '@tryghost/shade/components';
import { LucideIcon } from '@tryghost/shade/utils';

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
        className="grow justify-center"
        data-testid="post-preview-unavailable"
        description="A post gets its preview link the first time it is saved."
        title="Nothing to preview yet"
      >
        <LucideIcon.Eye />
      </EmptyIndicator>
    );
  }

  return (
    <PreviewChrome data-testid="post-preview-browser" device={device}>
      <iframe
        className="size-full border-0"
        data-testid="post-preview-browser-frame"
        src={browserPreviewUrl(previewUrl, audience)}
        title="Post preview"
      />
    </PreviewChrome>
  );
}
