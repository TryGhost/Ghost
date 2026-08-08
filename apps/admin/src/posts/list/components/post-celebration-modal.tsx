import {getCelebrationCopy} from '@/posts/list/post-celebration-copy';
import PostShareModal from '@/shared/analytics/post-share-modal';
import type {PostListItem} from '@/posts/list/hooks/use-posts-list';

interface PostCelebrationModalProps {
    post: PostListItem;
    /** 'post' or 'page', as the editor wrote it. */
    type: string;
    wasPublished: boolean;
    /** Total published posts. Absent until the count request lands. */
    postCount?: number;
    siteTitle: string;
    onClose: () => void;
}

/**
 * The post-publish celebration, shown when the Ember editor hands one over.
 *
 * Wraps `PostShareModal`, which takes all of its copy as props — so the wording
 * lives in `post-celebration-copy.ts` and this is only assembly.
 */
export function PostCelebrationModal({
    post, type, wasPublished, postCount, siteTitle, onClose
}: PostCelebrationModalProps) {
    const copy = getCelebrationCopy({
        wasPublished,
        type,
        emailOnly: post.email_only === true,
        postCount
    });

    return (
        <PostShareModal
            author={post.authors?.[0]?.name ?? ''}
            emailOnly={post.email_only === true}
            featureImageURL={post.feature_image ?? ''}
            postExcerpt={post.excerpt ?? post.custom_excerpt ?? ''}
            postTitle={post.title}
            postURL={post.url}
            primaryTitle={copy.primary}
            secondaryTitle={copy.secondary}
            siteTitle={siteTitle}
            open
            onClose={onClose}
            onOpenChange={(open) => {
                if (!open) {
                    onClose();
                }
            }}
        />
    );
}
