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
 * Check if a URL should be clickable (i.e., it's a valid frontend URL)
 * @param attributionUrl - The attribution URL path
 * @returns Whether the URL should be clickable
 */
export function shouldMakeClickable(attributionUrl: string): boolean {
    // Always make clickable if we have an attribution URL
    // This includes posts, pages, system pages like homepage, tag pages, author pages
    return Boolean(attributionUrl);
}

/**
 * Get the click handler for a content item
 * @param attributionUrl - The attribution URL path
 * @param postId - The post ID (if available)
 * @param siteUrl - The site's base URL
 * @param navigate - The navigation function for analytics routes
 * @returns The appropriate click handler
 */
export function getClickHandler(
    attributionUrl: string,
    postId: string | null | undefined,
    siteUrl: string,
    navigate: (path: string, options?: {crossApp?: boolean}) => void
) {
    return () => {
        // For posts with analytics, go to analytics page
        if (postId && attributionUrl) {
            // Check if this is a post by seeing if it's not a system page
            const isSystemPage = attributionUrl === '/' || 
                                 attributionUrl.startsWith('/tag/') || 
                                 attributionUrl.startsWith('/tags/') ||
                                 attributionUrl.startsWith('/author/') ||
                                 attributionUrl.startsWith('/authors/');
            
            if (!isSystemPage) {
                navigate(`/posts/analytics/beta/${postId}`, {crossApp: true});
                return;
            }
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