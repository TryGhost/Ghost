// Slim port of /e2e/data-factory: same call shapes, persisting through the
// Admin API like upstream's ghost-api adapter.
import type {APIRequestContext} from '@playwright/test';

export interface Tag {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    url?: string;
}

export interface Post {
    id: string;
    title: string;
    slug: string;
    status: string;
    tags?: Array<{id: string}>;
}

const unique = () => Math.random().toString(36).slice(2, 8);

export class TagFactory {
    constructor(private readonly request: APIRequestContext) {}

    async create(options: Partial<Tag> = {}): Promise<Tag> {
        const name = options.name ?? `Tag ${unique()}`;
        const response = await this.request.post('/ghost/api/admin/tags/', {
            data: {tags: [{
                name,
                slug: options.slug ?? `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${unique()}`,
                description: options.description ?? null
            }]}
        });
        if (!response.ok()) {
            throw new Error(`Failed to create tag: ${response.status()} ${await response.text()}`);
        }
        const body = await response.json() as {tags: Tag[]};
        return body.tags[0]!;
    }
}

export class PostFactory {
    constructor(private readonly request: APIRequestContext) {}

    async create(options: Partial<Post> & {tags?: Array<{id: string}>} = {}): Promise<Post> {
        const response = await this.request.post('/ghost/api/admin/posts/', {
            data: {posts: [{
                title: options.title ?? `Post ${unique()}`,
                status: options.status ?? 'draft',
                lexical: JSON.stringify({root: {children: [], direction: null, format: '', indent: 0, type: 'root', version: 1}}),
                ...(options.tags ? {tags: options.tags} : {})
            }]}
        });
        if (!response.ok()) {
            throw new Error(`Failed to create post: ${response.status()} ${await response.text()}`);
        }
        const body = await response.json() as {posts: Post[]};
        return body.posts[0]!;
    }
}

export const createTagFactory = (request: APIRequestContext) => new TagFactory(request);
export const createPostFactory = (request: APIRequestContext) => new PostFactory(request);
