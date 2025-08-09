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
        followedByMe: post.author.followedByMe,
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
            followedByMe: post.repostedBy.followedByMe,
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
        summary: post.summary,
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
        likeCount: post.likeCount,
        liked: post.likedByMe,
        reposted: post.repostedByMe,
        repostCount: post.repostCount,
        authored: post.authoredByMe === true,
        metadata: post.metadata,
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

export function mapActivityToPost(activity: Activity): Post {
    const object = activity.object;
    const actor = activity.actor;
    const attributedTo = object.attributedTo;

    return {
        id: object.id,
        type: object.type === 'Article' ? PostType.Article : PostType.Note,
        title: object.name || '',
        excerpt: object.preview?.content || '',
        summary: object.summary || null,
        content: object.content || '',
        url: object.url || '',
        featureImageUrl: object.image || null,
        publishedAt: new Date(object.published || '').toISOString(),
        likeCount: 0,
        likedByMe: object.liked || false,
        replyCount: object.replyCount || 0,
        readingTimeMinutes: 0,
        attachments: object.attachment || [],
        author: {
            id: attributedTo.id,
            handle: getAccountHandle(
                new URL(attributedTo.id).host,
                attributedTo.preferredUsername
            ),
            name: attributedTo.name || '',
            url: attributedTo.id,
            avatarUrl: attributedTo.icon?.url || '',
            followedByMe: attributedTo.followedByMe || false
        },
        authoredByMe: object.authored || false,
        repostCount: object.repostCount || 0,
        repostedByMe: object.reposted || false,
        repostedBy:
            activity.type === 'Announce'
                ? {
                    id: actor.id,
                    handle: getAccountHandle(
                        new URL(actor.id).host,
                        actor.preferredUsername
                    ),
                    name: actor.name || '',
                    url: actor.id,
                    avatarUrl: actor.icon?.url || '',
                    followedByMe: actor.followedByMe || false
                }
                : null
    };
}

/**
 * Compute the handle for an account from the provided host and username
 *
 * @param host Host of the site the account belongs to
 * @param username Username of the account
 */
export function getAccountHandle(host?: string, username?: string) {
    return `@${username || 'unknown'}@${host?.replace(/^www\./, '') || 'unknown'}`;
}

