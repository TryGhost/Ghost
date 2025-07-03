import {Post} from '../api/posts';
import {TopPostViewsStats} from '../api/stats';

/**
 * Determines if a post has been sent as a newsletter
 * 
 * This follows the same logic as the Ember app's 'hasBeenEmailed' computed property:
 * https://github.com/TryGhost/Ghost/blob/main/ghost/admin/app/models/post.js
 * 
 * But also handles the case where emails exist but might not have a proper status field.
 * 
 * @param post - The post to check
 * @returns true if the post has been sent as a newsletter
 */
export function hasBeenEmailed(post: Post): boolean {
    // We're only checking posts, not pages
    const isPost = true;
    
    // Check if the post is published or sent
    const isPublished = post?.status === 'published';
    const isSent = post?.status === 'sent';
    
    // Check for email data and valid status
    const hasEmail = Boolean(post?.email);
    const validEmailStatus = post?.email?.status !== 'failed';
    
    // Enhanced check for email data:
    // - Check if email_count > 0, which means emails have been sent
    const hasEmailCount = typeof post?.email?.email_count === 'number' && post.email.email_count > 0;
    
    // A post has been emailed if:
    // 1. It's a post (not a page)
    // 2. It's either published or sent
    // 3. It has an email object
    // 4. AND EITHER:
    //    a. The email status is not 'failed' 
    //    b. OR the email_count > 0 (indicating emails have been sent)
    return isPost 
        && (isSent || isPublished)
        && hasEmail 
        && (validEmailStatus || hasEmailCount);
} 

// Utility function to generate post status text
export function getPostStatusText(post: TopPostViewsStats): string {
    const hasEmail = post.open_rate !== null;

    if (post.status === 'sent') {
        return 'Email only';
    }

    if (post.status === 'published') {
        if (hasEmail) {
            return 'Published and sent';
        }
        return 'Published';
    }

    return post.status;
};
