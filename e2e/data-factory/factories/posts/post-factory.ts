import {Factory} from '../factory';
import type {PersistenceAdapter} from '../../persistence/adapter';
import {randomTitle, randomParagraphs, randomParagraph, randomBoolean} from '../../../helpers/utils/generators';
import {generateId, generateUuid, generateSlug} from '../../utils';

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
    feature_image: string;
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
}

/**
 * Simple factory for creating Ghost posts.
 */
export class PostFactory extends Factory<Partial<Post>, Post> {
    name = 'post'; // Factory identifier
    entityType = 'posts'; // Entity name (for adapter; currently the database table)

    constructor(adapter?: PersistenceAdapter) {
        super(adapter);
    }
    
    build(options: Partial<Post> = {}): Post {
        const now = new Date();
        const title = options.title || randomTitle();
        const content = randomParagraphs(3);
        
        // Generate lexical format (Ghost's current editor)
        const lexical = {
            root: {
                children: [{
                    children: [{
                        detail: 0,
                        format: 0,
                        mode: 'normal',
                        style: '',
                        text: content,
                        type: 'text',
                        version: 1
                    }],
                    direction: 'ltr',
                    format: '',
                    indent: 0,
                    type: 'paragraph',
                    version: 1
                }],
                direction: 'ltr',
                format: '',
                indent: 0,
                type: 'root',
                version: 1
            }
        };
        
        // Create defaults object
        const defaults: Post = {
            id: generateId(),
            uuid: generateUuid(),
            title: title,
            slug: options.slug || generateSlug(title) + '-' + Date.now().toString(16),
            mobiledoc: null,
            lexical: JSON.stringify(lexical),
            html: `<p>${content}</p>`,
            comment_id: generateId(),
            plaintext: content,
            feature_image: `https://picsum.photos/800/600?random=${Math.random()}`,
            featured: randomBoolean(),
            type: 'post',
            status: 'draft',
            locale: null,
            visibility: 'public',
            email_recipient_filter: 'none',
            created_at: now,
            updated_at: now,
            published_at: null,
            custom_excerpt: randomParagraph(),
            codeinjection_head: null,
            codeinjection_foot: null,
            custom_template: null,
            canonical_url: null,
            newsletter_id: null,
            show_title_and_feature_image: true
        };
        
        // Determine published_at based on status and user options
        let publishedAt = options.published_at ?? defaults.published_at;
        if (options.status === 'published' && !options.published_at) {
            publishedAt = now;
        }
        
        // Merge with user options
        const post: Post = {
            ...defaults,
            ...options,
            published_at: publishedAt
        } as Post;
        
        return post;
    }
}