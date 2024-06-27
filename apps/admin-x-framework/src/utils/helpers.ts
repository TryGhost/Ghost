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
