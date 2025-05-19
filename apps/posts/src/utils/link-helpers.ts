export const sanitizeUrl = (url: string): string => {
    return url.replace(/^https?:\/\//, '');
};

export const cleanTrackedUrl = (url: string, showTitle = false): string => {
    // Extract the URL before the ? but keep the hash part
    const [urlPart, queryPart] = url.split('?');

    if (!queryPart) {
        // Check if the urlPart itself has a hash
        const hashIndex = urlPart.indexOf('#');
        if (hashIndex > -1) {
            return showTitle ? urlPart.substring(0, hashIndex) : urlPart;
        }
        return urlPart;
    }

    // If there's a hash in the query part, preserve it
    const hashMatch = queryPart.match(/#(.+)$/);
    if (hashMatch) {
        return showTitle ? urlPart : `${urlPart}#${hashMatch[1]}`;
    }

    return urlPart;
};