import {Post} from '../api/posts';

/**
 * Determines if a post is email-only (newsletter only, not published to the web)
 */
export function isEmailOnly(post: Post): boolean {
    return Boolean(post.email_only) && post.status === 'sent';
}

/**
 * Determines if a post is published-only (web only, no email sent)
 */
export function isPublishedOnly(post: Post): boolean {
    return post.status === 'published' && !hasBeenEmailed(post);
}

/**
 * Determines if a post is both published and emailed
 */
export function isPublishedAndEmailed(post: Post): boolean {
    return post.status === 'published' && hasBeenEmailed(post);
}

/**
 * Determines if a post has been sent as an email
 * Based on the logic from admin-x-framework/src/utils/post-utils.ts
 */
function hasBeenEmailed(post: Post): boolean {
    const isPublished = post.status === 'published';
    const isSent = post.status === 'sent';
    const hasEmail = Boolean(post.email);
    const validEmailStatus = post.email?.status !== 'failed';
    const hasEmailCount = typeof post.email?.email_count === 'number' && post.email.email_count > 0;
    
    return (isSent || isPublished)
        && hasEmail 
        && (validEmailStatus || hasEmailCount);
}

/**
 * Gets the appropriate metrics to display based on post type and settings
 */
export function getPostMetricsToDisplay(post: Post, settings?: {membersTrackSources?: boolean}) {
    const showMemberGrowth = settings?.membersTrackSources ?? true;
    
    if (isEmailOnly(post)) {
        return {
            showEmailMetrics: true,
            showWebMetrics: false,
            showMemberGrowth
        };
    }
    
    if (isPublishedOnly(post)) {
        return {
            showEmailMetrics: false,
            showWebMetrics: true,
            showMemberGrowth
        };
    }
    
    if (isPublishedAndEmailed(post)) {
        return {
            showEmailMetrics: true,
            showWebMetrics: true,
            showMemberGrowth
        };
    }
    
    // Default fallback
    return {
        showEmailMetrics: false,
        showWebMetrics: true,
        showMemberGrowth
    };
}

/**
 * Post type information with computed properties
 */
 