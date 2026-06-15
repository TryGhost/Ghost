/** Current page hostname without a leading `www.` — the outbound `ref` source. */
export function getRefDomain(): string {
    return window.location.hostname.replace(/^www\./, '');
}

/**
 * Append a `ref` source tag to an outbound recommendation URL when outbound
 * link tagging is on — but never overwrite an existing source attribution.
 * Mirrors Portal's recommendations-page refUrl logic.
 */
export function buildRefUrl(url: string, outboundLinkTagging: boolean, refDomain: string): string {
    if (!outboundLinkTagging) return url;
    try {
        const ref = new URL(url);
        if (ref.searchParams.has('ref') || ref.searchParams.has('utm_source') || ref.searchParams.has('source')) {
            return url;
        }
        ref.searchParams.set('ref', refDomain);
        return ref.toString();
    } catch {
        return url;
    }
}
