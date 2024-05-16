import ObjectID from 'bson-objectid';
import {URI} from './uri.object';

export type Post = {
    id: ObjectID;
    title: string;
    slug: string;
    html: string;
    visibility: string;
    featuredImage: URI | null;
    url: URI;
    publishedAt: Date | null;
    authors: string[];
    excerpt: string;
};

export interface PostRepository {
    getOne(id: ObjectID): Promise<Post | null>
}
