import {Factory} from './factory';
import {faker} from '@faker-js/faker';
import {generateId, generateSlug} from '../fixtures/utils';

export interface PostOptions {
    id?: string;
    uuid?: string;
    title?: string;
    slug?: string;
    mobiledoc?: string | null;
    lexical?: string | null;
    html?: string | null;
    comment_id?: string | null;
    plaintext?: string | null;
    feature_image?: string | null;
    featured?: boolean;
    type?: 'post' | 'page';
    status?: 'published' | 'draft' | 'scheduled' | 'sent';
    locale?: string | null;
    visibility?: string;
    email_recipient_filter?: string;
    created_at?: Date;
    created_by?: string;
    updated_at?: Date;
    updated_by?: string;
    published_at?: Date | null;
    published_by?: string | null;
    custom_excerpt?: string | null;
    codeinjection_head?: string | null;
    codeinjection_foot?: string | null;
    custom_template?: string | null;
    canonical_url?: string | null;
    newsletter_id?: string | null;
    show_title_and_feature_image?: boolean;
}

// Return type for created posts
export type PostResult = PostOptions & {
    id: string;
    uuid: string;
    title: string;
    slug: string;
    status: PostOptions['status'];
    type: PostOptions['type'];
    created_at: Date;
    updated_at: Date;
    mobiledoc: string | null;
    lexical: string | null;
    html: string | null;
    comment_id: string | null;
    plaintext: string | null;
    feature_image: string | null;
    locale: string | null;
    visibility: string;
    email_recipient_filter: string;
    created_by?: string;
    updated_by?: string;
    custom_excerpt: string | null;
    codeinjection_head: string | null;
    codeinjection_foot: string | null;
    custom_template: string | null;
    canonical_url: string | null;
    newsletter_id: string | null;
    show_title_and_feature_image: boolean;
    featured: boolean;
};

export class PostFactory extends Factory<PostOptions, PostResult> {
    name = 'post';
    entityType = 'posts'; // Maps to 'posts' table

    build(options: PostOptions = {}): PostResult {
        const now = new Date();
        const title = options.title || faker.lorem.sentences();
        const content = faker.lorem.paragraphs(3);

        // Generate mobiledoc format
        const mobiledoc = {
            version: '0.3.1',
            atoms: [],
            cards: [],
            markups: [],
            sections: [[1, 'p', [[0, [], 0, content]]]],
            ghostVersion: '5.0'
        };

        // Create defaults object
        const defaults = {
            id: generateId(),
            uuid: faker.datatype.uuid(),
            title: title,
            slug: options.slug || generateSlug(title) + '-' + Date.now().toString(16),
            mobiledoc: JSON.stringify(mobiledoc),
            lexical: null,
            html: `<p>${content}</p>`,
            comment_id: generateId(),
            plaintext: content,
            feature_image: `https://picsum.photos/800/600?random=${Math.random()}`,
            featured: faker.datatype.boolean(),
            type: 'post',
            status: 'draft',
            locale: null,
            visibility: 'public',
            email_recipient_filter: 'none',
            created_at: now,
            updated_at: now,
            published_at: null,
            custom_excerpt: faker.lorem.paragraph(),
            codeinjection_head: null,
            codeinjection_foot: null,
            custom_template: null,
            canonical_url: null,
            newsletter_id: null,
            show_title_and_feature_image: true
        };

        // Merge with user options, handling special cases
        const post: PostResult = {
            ...defaults,
            ...options,
            // Handle published_at logic - if status is published but no published_at is set, use current time
            published_at: options.status === 'published' && !options.published_at ? now : (options.published_at || defaults.published_at)
        } as PostResult;

        return post;
    }
}
