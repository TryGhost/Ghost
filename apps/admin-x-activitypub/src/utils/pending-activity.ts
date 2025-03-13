import {Activity, ActorProperties} from '@tryghost/admin-x-framework/api/activitypub';

export const PENDING_ACTIVITY_PREFIX = 'pending-';

export function generatePendingActivityId() {
    return `${PENDING_ACTIVITY_PREFIX}${crypto.randomUUID()}`;
}

export function isPendingActivity(id: string) {
    return id.startsWith(PENDING_ACTIVITY_PREFIX);
}

export function generatePendingActivity(actorProps: ActorProperties, id: string, content: string): Activity {
    const actor: ActorProperties = {
        id: actorProps.url,
        icon: actorProps.icon,
        name: actorProps.name,
        preferredUsername: actorProps.preferredUsername,
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

    return {
        id,
        type: 'Create',
        actor,
        object: {
            type: 'Note',
            name: '',
            content: content,
            url: '',
            attributedTo: actor,
            image: '',
            published: new Date().toISOString(),
            attachment: [],
            preview: {
                type: 'Note',
                content: content
            },
            // These are used in the app, but are not part of the ObjectProperties type
            id,
            replyCount: 0,
            liked: false,
            reposted: false,
            repostCount: 0,
            authored: true,
            // These are not used but needed to comply with the ObjectProperties type
            '@context': ''
        },
        // These are not used but needed to comply with the Activity type
        '@context': '',
        to: ''
    };
}

export function formatPendingActivityContent(content: string) {
    return content.replace(/\n/g, '<br />');
}
