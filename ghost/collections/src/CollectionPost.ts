// eslint-disable-next-line ghost/filenames/match-regex
export type CollectionPost = {
    id: string;
    featured?: boolean;
    published_at?: Date;
    tags?: Array<{slug: string}>;
};
