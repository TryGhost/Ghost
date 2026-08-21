import {JSONObject} from './config';

export type ActivityPubContext = string | (string | JSONObject)[];

export type ActivityPubAttachment = {
    type: string;
    mediaType?: string;
    name?: string;
    url: string;
};

export type ObjectMetadata = {
    ghostAuthors?: Array<{
        name: string;
        profile_image: string;
    }>;
};

export type FollowItem = {
    id: string;
    preferredUsername: string;
};

export type ObjectProperties = {
    '@context': ActivityPubContext;
    id: string;
    type: 'Article' | 'Link' | 'Note' | 'Tombstone';
    name: string;
    content: string | null;
    summary: string | null;
    url?: string | undefined;
    attributedTo?: ActorProperties | string | ActorProperties[] | JSONObject | JSONObject[];
    image?: string | {
        url: string;
        mediaType?: string;
        type?: string;
    };
    attachment?: ActivityPubAttachment | ActivityPubAttachment[];
    published?: string;
    createdAt?: string;
    preview?: {type: string, content: string | null};
    replyCount: number;
    likeCount: number;
    liked?: boolean;
    reposted?: boolean;
    repostCount: number;
    authored: boolean;
    metadata?: ObjectMetadata;
    sensitive?: boolean;
    contentWarning?: string | null;
}

export type ActorProperties = {
    '@context': ActivityPubContext;
    attachment?: {
        type: string;
        name: string;
        value: string;
    }[];
    discoverable: boolean;
    featured: string;
    followers: string;
    following: string;
    id: string | null;
    image: {
        url: string;
    };
    icon: {
        url: string;
    };
    inbox: string;
    manuallyApprovesFollowers: boolean;
    name: string;
    outbox: string;
    preferredUsername: string;
    handle?: string;
    followedByMe?: boolean;
    followsMe?: boolean;
    followingCount?: number;
    followerCount?: number;
    bio?: string;
    avatarUrl?: string | null;
    publicKey: {
        id: string;
        owner: string;
        publicKeyPem: string;
    };
    published: string;
    summary: string;
    type: 'Person';
    url: string;
}

export type Activity = {
    '@context': string;
    id: string;
    type: string;
    actor: ActorProperties;
    object: ObjectProperties;
    to: string;
}

export type InboxResponseData = {
    '@context': string;
    id: string;
    summary: string;
    type: 'OrderedCollection';
    totalItems: number;
    items: Activity[];
}

export type FollowingResponseData = {
    '@context': string;
    id: string;
    summary: string;
    type: string;
    totalItems: number;
    items: FollowItem[];
}
