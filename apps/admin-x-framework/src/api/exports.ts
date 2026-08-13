import {downloadFromEndpoint} from '../utils/helpers';

export type SiteExportComponent = 'content' | 'members' | 'analytics' | 'themes' | 'routes';

/**
 * Downloads the sync site export zip as a plain navigation — the browser's
 * download manager streams it to disk, so even a large export never sits in
 * tab memory.
 */
export const downloadSiteExport = (components: SiteExportComponent[]) => {
    downloadFromEndpoint(`/exports/download/?components=${components.join(',')}`);
};
