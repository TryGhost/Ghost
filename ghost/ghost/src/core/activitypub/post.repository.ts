import ObjectID from 'bson-objectid';

export type Post = {
    id: ObjectID;
    title: string;
    slug: string;
    html: string;
    visibility: string;
};

export interface PostRepository {
    getOne(id: ObjectID): Promise<Post | null>
}
