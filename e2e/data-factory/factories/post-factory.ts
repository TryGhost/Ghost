import {Factory} from '@/data-factory';
import {buildLexical} from './lexical';
import {faker} from '@faker-js/faker';
import {generateId, generateSlug, generateUuid} from '@/data-factory';
import type {CardSpec} from './lexical';

export interface Post {
    id: string;
    uuid: string;
    title: string;
    slug: string;
    mobiledoc: string | null;
    lexical: string | null;
    html: string;
    comment_id: string;
    plaintext: string;
    feature_image: string | null;
    featured: boolean;
    type: string;
    status: 'draft' | 'published' | 'scheduled';
    locale: string | null;
    visibility: string;
    email_recipient_filter: string;
    created_at: Date;
    updated_at: Date;
    published_at: Date | null;
    custom_excerpt: string;
    codeinjection_head: string | null;
    codeinjection_foot: string | null;
    custom_template: string | null;
    canonical_url: string | null;
    newsletter_id: string | null;
    show_title_and_feature_image: boolean;
    tags?: Array<{id: string}>;
    tiers?: Array<{id: string}>;
}

export class PostFactory extends Factory<Partial<Post>, Post> {
    entityType = 'posts'; // Entity name (for adapter; currently API endpoint)

    build(options: Partial<Post> = {}): Post {
        const now = new Date();
        const title = options.title || faker.lorem.sentence();
        const content = faker.lorem.paragraphs(3);

        const defaults: Post = {
            id: generateId(),
            uuid: generateUuid(),
            title: title,
            slug: options.slug || generateSlug(title) + '-' + Date.now().toString(16),
            mobiledoc: null,
            lexical: buildLexical(),
            html: `<p>${content}</p>`,
            comment_id: generateId(),
            plaintext: content,
            feature_image: null,
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
            show_title_and_feature_image: true,
            tags: undefined
        };

        // Determine published_at based on status and user options
        let publishedAt = options.published_at ?? defaults.published_at;
        if (options.status === 'published' && !options.published_at) {
            publishedAt = now;
        }

        return {...defaults, ...options, published_at: publishedAt} as Post;
    }

    async createWithCards(cards: CardSpec | CardSpec[], options: Partial<Post> = {}): Promise<Post> {
        const cardArray = Array.isArray(cards) ? cards : [cards];
        return this.create({...options, lexical: buildLexical(...cardArray)});
    }
}
