import {blobDownloadFromEndpoint, type BlobDownloadOptions} from '../utils/helpers';

export type SiteExportComponent = 'content' | 'members' | 'analytics' | 'themes' | 'routes';

/**
 * Downloads the sync site export zip. Fetch-based (rather than a plain
 * navigation) so callers can observe completion and errors — the dialog shows
 * a real "downloaded" state and failures surface instead of vanishing into a
 * hidden iframe. Browsers back large blobs with disk, so the zip doesn't have
 * to fit in tab memory.
 */
export const downloadSiteExport = (components: SiteExportComponent[], options: BlobDownloadOptions = {}): Promise<void> => {
    return blobDownloadFromEndpoint(`/exports/download/?components=${components.join(',')}`, 'site-export.zip', options);
};
