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
 * Extracts the filename from a `Content-Disposition` header, preferring the
 * RFC 5987 extended form (`filename*=`) over the basic `filename=` form.
 * Returns `undefined` when neither is present.
 */
export function getFilenameFromContentDisposition(header: string | null): string | undefined {
    if (!header) {
        return undefined;
    }

    // RFC 5987 ext-value is charset'language'value; capture it with one linear
    // pattern (no nested quantifiers — avoids ReDoS), then drop the prefix.
    const extendedMatch = header.match(/filename\*=([^;]+)/i);
    if (extendedMatch?.[1]) {
        const singleQuote = '\'';
        const extValue = extendedMatch[1].trim();
        const firstQuote = extValue.indexOf(singleQuote);
        const secondQuote = firstQuote === -1 ? -1 : extValue.indexOf(singleQuote, firstQuote + 1);
        const encoded = secondQuote === -1 ? extValue : extValue.slice(secondQuote + 1);
        try {
            return decodeURIComponent(encoded.replace(/^["']|["']$/g, ''));
        } catch {
            // Malformed encoding - fall through to the basic form
        }
    }

    const quotedMatch = header.match(/filename="([^"]*)"/i);
    if (quotedMatch?.[1]) {
        return quotedMatch[1].trim();
    }

    const unquotedMatch = header.match(/filename=([^;]+)/i);
    if (unquotedMatch?.[1]) {
        return unquotedMatch[1].trim();
    }

    return undefined;
}

/**
 * Downloads a file by fetching it as a blob and triggering a browser download.
 * Use this instead of downloadFile/downloadFromEndpoint for streaming responses
 * (e.g. large CSV exports) where the iframe approach may not work reliably.
 *
 * The filename comes from the response's `Content-Disposition` header;
 * `fallbackFilename` is only used when the server omits it.
 */
export async function blobDownload(url: string, fallbackFilename?: string): Promise<void> {
    const response = await fetch(url, {method: 'GET'});

    if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    const filename = getFilenameFromContentDisposition(response.headers.get('content-disposition'))
        ?? fallbackFilename
        ?? 'download';

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

export async function blobDownloadFromEndpoint(path: string, fallbackFilename?: string): Promise<void> {
    const url = `${getGhostPaths().apiRoot}${path}`;
    return blobDownload(url, fallbackFilename);
}
