import { PreviewChrome } from '@tryghost/shade/components';

import { browserPreviewUrl, type PreviewAudience, type PreviewDevice } from './preview-url';

interface BrowserPreviewProps {
  /** The post's public preview URL, before the audience params are applied. */
  previewUrl: string;
  audience: PreviewAudience;
  device: PreviewDevice;
}

export function BrowserPreview({ previewUrl, audience, device }: BrowserPreviewProps) {
  return (
    <PreviewChrome data-device={device} data-testid="post-preview-browser" device={device}>
      <iframe
        className="size-full border-0"
        data-testid="post-preview-browser-frame"
        src={browserPreviewUrl(previewUrl, audience)}
        title="Post preview"
      />
    </PreviewChrome>
  );
}
