// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ActivityPub {
    export type AnonymousObject = {
        '@context': string | string[];
        id: null;
        type: string | string[];
    };

    export type RootObject = {
        '@context': string | string [];
        id: string;
        type: string | string[];
    };

    export type Object = RootObject | AnonymousObject;

    export type Actor = ActivityPub.Object & {
        inbox: string;
        outbox: string;
        username?: string;
        preferredUsername?: string;
        publicKey?: {
            id: string,
            owner: string,
            publicKeyPem: string
        }
    };
}
