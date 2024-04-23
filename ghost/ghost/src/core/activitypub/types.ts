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
}
