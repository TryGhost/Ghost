const VERSIONED_SEGMENT = /^([^@]+)@[~^]?\d[\w.+-]*$/;

export function pinAssetVersion(url: string, version: string): string {
    if (!url || !version) {
        return url;
    }
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return url;
    }
    let pinned = false;
    parsed.pathname = parsed.pathname
        .split('/')
        .map((segment) => {
            if (pinned || !VERSIONED_SEGMENT.test(segment)) {
                return segment;
            }
            pinned = true;
            return segment.replace(VERSIONED_SEGMENT, `$1@${version}`);
        })
        .join('/');
    return pinned ? parsed.href : url;
}
