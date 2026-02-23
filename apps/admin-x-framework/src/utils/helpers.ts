export interface IGhostPaths {
    subdir: string;
    adminRoot: string;
    assetRoot: string;
    apiRoot: string;
    activityPubRoot: string;
}

export function getGhostPaths(): IGhostPaths {
    const path = window.location.pathname;
    const subdir = path.substr(0, path.search('/ghost/'));
    const adminRoot = `${subdir}/ghost/`;
    const assetRoot = `${subdir}/ghost/assets/`;
    const apiRoot = `${subdir}/ghost/api/admin`;
    const activityPubRoot = `${subdir}/.ghost/activitypub`;
    return {subdir, adminRoot, assetRoot, apiRoot, activityPubRoot};
}

export function downloadFile(url: string) {
    let iframe = document.getElementById('iframeDownload');

    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'iframeDownload';
        iframe.style.display = 'none';
        document.body.append(iframe);
    }

    iframe.setAttribute('src', url);
}

export function downloadFromEndpoint(path: string) {
    downloadFile(`${getGhostPaths().apiRoot}${path}`);
}

/**
 * Downloads a file by fetching it as a blob and triggering a browser download.
 * Use this instead of downloadFile/downloadFromEndpoint for streaming responses
 * (e.g. large CSV exports) where the iframe approach may not work reliably.
 */
export async function blobDownload(url: string, filename: string): Promise<void> {
    const response = await fetch(url, {method: 'GET'});

    if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(blobUrl);
}

export async function blobDownloadFromEndpoint(path: string, filename: string): Promise<void> {
    const url = `${getGhostPaths().apiRoot}${path}`;
    return blobDownload(url, filename);
}
