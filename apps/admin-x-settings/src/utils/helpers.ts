export interface IGhostPaths {
    subdir: string;
    adminRoot: string;
    assetRoot: string;
    apiRoot: string;
}

export function getGhostPaths(): IGhostPaths {
    let path = window.location.pathname;
    let subdir = path.substr(0, path.search('/ghost/'));
    let adminRoot = `${subdir}/ghost/`;
    let assetRoot = `${subdir}/ghost/assets/`;
    let apiRoot = `${subdir}/ghost/api/admin`;
    return {subdir, adminRoot, assetRoot, apiRoot};
}

export function resolveAsset(assetPath: string, relativeTo: string) {
    if (assetPath.match(/^(?:[a-z]+:)?\/\//i)) {
        return assetPath;
    }

    return `${relativeTo}${assetPath}`;
}

export function getLocalTime(timeZone: string) {
    const date = new Date();
    const options = {timeZone: timeZone};
    const userLocale = navigator.language.startsWith('en') ? navigator.language : 'en-US';
    const localTime = date.toLocaleString(userLocale, options);
    return localTime;
}

export function getOptionLabel(
    options: {value: string; label: string}[], value: string
): string | undefined {
    return options?.find(option => option.value === value)?.label;
}

export function getInitials(name: string = '') {
    let rgx = new RegExp(/(\p{L}{1})\p{L}+/, 'gu');
    let rgxInitials = [...name.matchAll(rgx)] || [];

    const initials = (
        (rgxInitials.shift()?.[1] || '') + (rgxInitials.pop()?.[1] || '')
    ).toUpperCase();

    return initials;
}

export function generateAvatarColor(name: string) {
    const s = 70;
    const l = 40;
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    const h = hash % 360;
    return 'hsl(' + h + ', ' + s + '%, ' + l + '%)';
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

export function numberWithCommas(x: number) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function isObjectId(value: string) {
    return /^[a-z0-9]{24}$/.test(value);
}
