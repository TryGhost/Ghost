import {blobDownloadFromEndpoint, type BlobDownloadOptions} from '../utils/helpers';

export type SiteExportComponent = 'content' | 'members' | 'analytics' | 'themes' | 'routes';

/**
 * Downloads the sync site export zip. Fetch-based rather than a plain
 * navigation so callers can observe completion, errors and cancellation —
 * a navigation download is invisible to the page.
 */
export const downloadSiteExport = (components: SiteExportComponent[], options: BlobDownloadOptions = {}): Promise<void> => {
    return blobDownloadFromEndpoint(`/exports/download/?components=${components.join(',')}`, 'site-export.zip', options);
};
