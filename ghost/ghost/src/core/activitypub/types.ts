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

    export type SubObject = {
        id: string;
        type: string | string[];
    };

    export type Object = RootObject | AnonymousObject | SubObject;

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
        },

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [x: string]: any
    };

    export type Article = ActivityPub.Object & {
        type: 'Article';
        name: string;
        content: string;
        url?: string;
        attributedTo?: string | object[];
        image?: string;
        published?: string;
        preview?: {type: string, content: string};
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

    export type ActivityType = 'Create' | 'Update' | 'Delete' | 'Follow' | 'Accept' | 'Reject' | 'Undo';

    export type Activity = ActivityPub.Object & {
        type: ActivityType;
        actor: Link | Actor | ActivityPub.Object;
        object: Link | ActivityPub.Object;
        to: Link | Actor | null;
    }
}
