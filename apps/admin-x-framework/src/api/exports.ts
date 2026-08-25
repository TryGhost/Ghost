import { blobDownloadFromEndpoint, type BlobDownloadOptions } from '../utils/helpers';
import { createMutation } from '../utils/api/hooks';

export type SiteExportComponent = 'content' | 'members' | 'analytics' | 'themes' | 'routes';

/**
 * Downloads the sync site export zip. Fetch-based rather than a plain
 * navigation so callers can observe completion, errors and cancellation —
 * a navigation download is invisible to the page.
 */
export const downloadSiteExport = (
  components: SiteExportComponent[],
  options: BlobDownloadOptions = {},
): Promise<void> => {
  return blobDownloadFromEndpoint(
    `/exports/download/?components=${components.join(',')}`,
    'site-export.zip',
    options,
  );
};

export type ExportComponents = {
  content?: boolean;
  members?: boolean;
  analytics?: boolean;
  themes?: boolean;
  routes?: boolean;
  media?: boolean;
};

export type ExportRequestPayload = {
  components: ExportComponents;
};

export const useRequestExport = createMutation<unknown, ExportRequestPayload>({
  method: 'POST',
  path: () => '/exports/',
  body: ({ components }) => ({ components }),
  // Not idempotent: each delivered request can schedule an archive and an
  // email, so a lost response must not trigger an automatic re-send.
  retry: false,
});
