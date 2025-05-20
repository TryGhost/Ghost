import {Post} from '../api/posts';

/**
 * Determines if a post has been sent as a newsletter
 * 
 * This follows the same logic as the Ember app's 'hasBeenEmailed' computed property:
 * https://github.com/TryGhost/Ghost/blob/main/ghost/admin/app/models/post.js
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
    
    // A post has been emailed if:
    // 1. It's a post (not a page)
    // 2. It's either published or sent
    // 3. It has an email object
    // 4. The email status is not 'failed'
    return isPost 
        && (isSent || isPublished)
        && Boolean(post?.email) 
        && post.email?.status !== 'failed';
} 