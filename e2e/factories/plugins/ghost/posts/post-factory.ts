import {Factory} from '../../../base-factory';
import {faker} from '@faker-js/faker';
import {generateId, generateUuid, generateSlug} from '../../../utils';
import type {PostOptions, PostResult} from './types';

/**
 * Simple factory for creating Ghost posts.
 */
export class PostFactory extends Factory<PostOptions, PostResult> {
    name = 'post';
    entityType = 'posts'; // Maps to 'posts' table
    
    constructor() {
        super();
    }
    
    build(options: PostOptions = {}): PostResult {
        const now = new Date();
        const title = options.title || faker.lorem.sentence();
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
            uuid: generateUuid(),
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