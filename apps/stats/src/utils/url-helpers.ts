/**
 * Generate a frontend URL from an attribution path and site URL
 * @param attributionUrl - The path from attribution data (e.g., '/', '/tag/slug/', '/author/slug/')
 * @param siteUrl - The site's base URL (e.g., 'https://example.com')
 * @returns The full frontend URL
 */
export function getFrontendUrl(attributionUrl: string, siteUrl: string): string {
    if (!attributionUrl || !siteUrl) {
        return '';
    }

    try {
        const baseUrl = new URL(siteUrl);
        const subdir = baseUrl.pathname.endsWith('/') ? baseUrl.pathname : `${baseUrl.pathname}/`;
        
        // Remove leading slash from attribution URL to avoid double slashes
        const cleanPath = attributionUrl.replace(/^\//, '');
        const fullPath = `${subdir}${cleanPath}`;

        return `${baseUrl.origin}${fullPath}`;
    } catch (error) {
        // Silently handle URL construction errors
        return '';
    }
}

/**
 * Generate a human-readable title from a URL path
 * This matches the backend _generateTitleFromPath logic for consistency
 * @param path - The URL path (e.g., '/', '/tag/slug/', '/author/slug/')
 * @returns A formatted title
 */
export function generateTitleFromPath(path: string): string {
    if (!path) {
        return 'Unknown';
    }
    
    // Handle common Ghost paths
    if (path === '/') {
        return 'Homepage';
    }
    if (path.startsWith('/tag/')) {
        const segments = path.split('/');
        return segments.length > 2 && segments[2] ? `tag/${segments[2]}` : 'tag/unknown';
    }
    if (path.startsWith('/tags/')) {
        const segments = path.split('/');
        return segments.length > 2 && segments[2] ? `tag/${segments[2]}` : 'tag/unknown';
    }
    if (path.startsWith('/author/')) {
        const segments = path.split('/');
        return segments.length > 2 && segments[2] ? `author/${segments[2]}` : 'author/unknown';
    }  
    if (path.startsWith('/authors/')) {
        const segments = path.split('/');
        return segments.length > 2 && segments[2] ? `author/${segments[2]}` : 'author/unknown';
    }
    
    // For other paths, just return the path itself
    return path;
}

/**
 * Check if a URL should be clickable based on attribution data
 * @param attributionUrl - The attribution URL path
 * @param urlExists - Whether the URL exists (from backend validation)
 * @returns Whether the URL should be clickable
 */
export function shouldMakeClickable(attributionUrl: string, urlExists?: boolean): boolean {
    // Must have an attribution URL
    if (!attributionUrl) {
        return false;
    }

    // If backend provided url_exists info, use it
    if (typeof urlExists === 'boolean') {
        return urlExists;
    }

    // Fallback: always make clickable if we have an attribution URL (backward compatibility)
    return true;
}

/**
 * Get the click handler for a content item
 * @param attributionUrl - The attribution URL path
 * @param postId - The post ID (if available)
 * @param siteUrl - The site's base URL
 * @param navigate - The navigation function for analytics routes
 * @param attributionType - The attribution type ('post', 'page', 'url', 'tag', 'author')
 * @returns The appropriate click handler
 */
export function getClickHandler(
    attributionUrl: string,
    postId: string | null | undefined,
    siteUrl: string,
    navigate: (path: string, options?: {crossApp?: boolean}) => void,
    attributionType?: string
) {
    return () => {
        // For posts with analytics, go to analytics page
        if (postId && attributionUrl && attributionType === 'post') {
            navigate(`/posts/analytics/${postId}`, {crossApp: true});
            return;
        }
        
        // For all other cases (pages, system pages), open frontend URL in new tab
        if (attributionUrl && siteUrl) {
            const frontendUrl = getFrontendUrl(attributionUrl, siteUrl);
            if (frontendUrl) {
                window.open(frontendUrl, '_blank', 'noopener,noreferrer');
            }
        }
    };
} 