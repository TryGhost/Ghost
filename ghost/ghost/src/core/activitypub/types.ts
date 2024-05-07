// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ActivityPub {
    export type AnonymousObject = {
        '@context': string | (string | object)[];
        id: null;
        type: string | string[];
    };

    export type RootObject = {
        '@context': string | (string | object)[];
        id: string;
        type: string | string[];
    };

    export type Object = RootObject | AnonymousObject;

    export type Actor = ActivityPub.Object & {
        inbox: string;
        outbox: string;
        name: string;
        preferredUsername: string;
        summary: string;
        url: string;
        icon: string;
        image: string;
        published: string;
        manuallyApprovesFollowers: boolean;
        discoverable: boolean;
        attachment: object[];
        following: string;
        followers: string;
        featured: string;

        publicKey: {
            id: string,
            owner: string,
            publicKeyPem: string
        }
    };

    export type Article = ActivityPub.Object & {
        type: 'Article';
        name: string;
        content: string;
        url: string;
        attributedTo: string | object[];
    };

    export type Link = string | {
        type: 'Link'
        href: string
        id?: string
        hreflang?: string
        mediaType?: string
        rel?: string
        height?: number
        width?: number
    };

    export type ActivityType = 'Create' | 'Update' | 'Delete';

    export type Activity = ActivityPub.Object & {
        type: ActivityType;
        summary: string;
        actor: Link | Actor;
        object: Link | ActivityPub.Object;
    }
}
