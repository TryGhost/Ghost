import { useCallback } from 'react';
import { type ImageFieldUpload, useImageFieldUpload } from '@/editor/use-image-field-upload';
import type { EditorSettingsPort } from './editor-settings-port';
import type { SocialCardNetwork } from './social-card-networks';

export interface SocialCardImage {
  src: string;
  edit: (src: string | null) => void;
  upload: ImageFieldUpload;
}

/**
 * A card's image and its upload, held by whatever stays mounted while the card's
 * fields come and go, so an upload in flight outlives its pane or tab.
 */
export function useSocialCardImage(
  session: EditorSettingsPort,
  network: SocialCardNetwork,
): SocialCardImage {
  const edit = useCallback(
    (src: string | null) => session.editSettings({ [network.imageKey]: src }),
    [network.imageKey, session],
  );
  const upload = useImageFieldUpload(`${network.name} image`, edit);

  return { src: session.settings[network.imageKey] ?? '', edit, upload };
}
