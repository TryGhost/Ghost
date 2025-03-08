import {Activity, Post, PostType} from '../api/activitypub';
import {ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';

/**
 * Map a Post to an ActivityPub activity
 *
 * @param post The post to map to an ActivityPub activity
 */
export function mapPostToActivity(post: Post): Activity {
    let activityType = '';

    // If the post has been reposted, then the corresponding activity type
    // is: "Announce", otherwise the activity type is: "Create"
    if (post.repostedBy !== null) {
        activityType = 'Announce';
    } else {
        activityType = 'Create';
    }

    const actor: ActorProperties = {
        id: post.author.url,
        icon: {
            url: post.author.avatarUrl
        },
        name: post.author.name,
        preferredUsername: post.author.handle.split('@')[1],
        // These are not used but needed to comply with the ActorProperties type
        '@context': '',
        discoverable: false,
        featured: '',
        followers: '',
        following: '',
        image: {url: ''},
        inbox: '',
        manuallyApprovesFollowers: false,
        outbox: '',
        publicKey: {
            id: '',
            owner: '',
            publicKeyPem: ''
        },
        published: '',
        summary: '',
        type: 'Person',
        url: ''
    };

    let repostedBy: ActorProperties | null = null;

    if (post.repostedBy !== null) {
        repostedBy = {
            id: post.repostedBy.url,
            icon: {
                url: post.repostedBy.avatarUrl
            },
            name: post.repostedBy.name,
            preferredUsername: post.repostedBy.handle.split('@')[1],
            // These are not used but needed to comply with the ActorProperties type
            '@context': '',
            discoverable: false,
            featured: '',
            followers: '',
            following: '',
            image: {url: ''},
            inbox: '',
            manuallyApprovesFollowers: false,
            outbox: '',
            publicKey: {
                id: '',
                owner: '',
                publicKeyPem: ''
            },
            published: '',
            summary: '',
            type: 'Person',
            url: ''
        };
    }

    let objectType: 'Article' | 'Note' | 'Tombstone' = 'Note';

    if (post.type === PostType.Article) {
        objectType = 'Article';
    } else if (post.type === PostType.Tombstone) {
        objectType = 'Tombstone';
    }

    const object = {
        type: objectType,
        name: post.title,
        content: post.content,
        url: post.url,
        attributedTo: actor,
        image: post.featureImageUrl ?? '',
        published: post.publishedAt,
        attachment: post.attachments,
        preview: {
            type: '',
            content: post.excerpt
        },
        // These are used in the app, but are not part of the ObjectProperties type
        id: post.id,
        replyCount: post.replyCount,
        liked: post.likedByMe,
        reposted: post.repostedByMe,
        repostCount: post.repostCount,
        authored: post.authoredByMe === true,
        // These are not used but needed to comply with the ObjectProperties type
        '@context': ''
    };

    return {
        id: post.id,
        type: activityType,
        // If the post has been reposted, then the actor should be the sharer
        // (the object of the repost is still attributed to the original author)
        actor: repostedBy !== null ? repostedBy : actor,
        object,

        // These are not used but needed to comply with the Activity type
        '@context': '',
        to: ''
    };
}

/**
 * Map an ActivityPub activity to a Post
 *
 * @param activity The ActivityPub activity to map to a Post
 */
export function mapActivityToPost(activity: Activity): Post {
    const isRepost = activity.type === 'Announce';

    const object = activity.object;

    let postType = PostType.Note;

    if (object.type === 'Article') {
        postType = PostType.Article;
    } else if (object.type === 'Tombstone') {
        postType = PostType.Tombstone;
    }

    const author = {
        id: object.attributedTo.id,
        name: object.attributedTo.name,
        handle: `@${object.attributedTo.preferredUsername}@${new URL(object.attributedTo.id).hostname}`,
        url: object.attributedTo.id,
        avatarUrl: object.attributedTo.icon?.url || ''
    };

    let repostedBy = null;

    if (isRepost) {
        repostedBy = {
            id: activity.actor.id,
            name: activity.actor.name,
            handle: `@${activity.actor.preferredUsername}@${new URL(activity.actor.id).hostname}`,
            url: activity.actor.id,
            avatarUrl: activity.actor.icon?.url || ''
        };
    }

    return {
        id: object.id,
        type: postType,
        title: object.name || '',
        excerpt: object.preview?.content || '',
        content: object.content || '',
        url: object.url || '',
        featureImageUrl: object.image || null,
        publishedAt: object.published || '',
        likeCount: object.liked ? 1 : 0,
        likedByMe: object.liked || false,
        replyCount: object.replyCount || 0,
        readingTimeMinutes: calculateReadingTime(object.content || ''),
        attachments: object.attachment || [],
        author,
        authoredByMe: object.authored || false,
        repostCount: object.repostCount || 0,
        repostedByMe: object.reposted || false,
        repostedBy
    };
}

function calculateReadingTime(content: string): number {
    const wordsPerMinute = 275;

    const wordCount = content.replace(/<[^>]*>/g, '')
        .split(/\s+/)
        .filter(word => word.length > 0)
        .length;

    return Math.ceil(wordCount / wordsPerMinute);
}
