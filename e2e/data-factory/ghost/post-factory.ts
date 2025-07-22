import {Factory} from '../base-factory';
import type {Knex} from 'knex';
import {faker} from '@faker-js/faker';
import type {PostOptions, PostResult} from '../types';

export class PostFactory extends Factory {
    name = 'post';
    private db: Knex;
    private createdPostIds: Set<string> = new Set();
    
    constructor(db: Knex) {
        super();
        this.db = db;
    }
    
    async setup(): Promise<void> {
        // Any post-specific initialization
    }
    
    async destroy(): Promise<void> {
        await this.clearCreated();
    }
    
    async create(options: PostOptions = {}): Promise<PostResult> {
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
        const defaults: Required<PostOptions> = {
            id: this.generateId(),
            uuid: this.generateUuid(),
            title: title,
            slug: this.generateSlug(title),
            mobiledoc: JSON.stringify(mobiledoc),
            lexical: null,
            html: `<p>${content}</p>`,
            comment_id: this.generateId(),
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
        };
        
        await this.db('posts').insert(post);
        
        // Track created post for cleanup
        this.createdPostIds.add(post.id);
        
        return post;
    }
    
    /**
     * Create a published post with sensible defaults
     */
    async createPublished(options: PostOptions = {}): Promise<PostResult> {
        return this.create({
            status: 'published',
            published_at: options.published_at || new Date(),
            ...options
        });
    }
    
    /**
     * Create a draft post
     */
    async createDraft(options: PostOptions = {}): Promise<PostResult> {
        return this.create({
            status: 'draft',
            ...options
        });
    }
    
    /**
     * Create a scheduled post
     */
    async createScheduled(publishDate: Date, options: PostOptions = {}): Promise<PostResult> {
        return this.create({
            status: 'scheduled',
            published_at: publishDate,
            ...options
        });
    }
    
    /**
     * Clear all posts created by this factory instance
     */
    async clearCreated(): Promise<void> {
        if (this.createdPostIds.size > 0) {
            await this.db('posts').whereIn('id', Array.from(this.createdPostIds)).delete();
            this.createdPostIds.clear();
        }
    }
    
    /**
     * Get the count of posts created by this factory
     */
    getCreatedCount(): number {
        return this.createdPostIds.size;
    }
}