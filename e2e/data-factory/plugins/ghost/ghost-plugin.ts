import type {Knex} from 'knex';
import {BasePlugin} from '../base-plugin';
import {createDatabase} from './database';
import {PostFactory} from './posts/post-factory';
import type {PostOptions, PostResult} from './posts/types';

export interface GhostPluginOptions {
    database?: Knex;
}

/**
 * Ghost plugin that coordinates all Ghost-related factories
 * and shares the database connection between them
 */
export class GhostPlugin extends BasePlugin {
    readonly name = 'ghost';
    
    private db: Knex;
    private postFactory: PostFactory;
    
    constructor(options: GhostPluginOptions = {}) {
        super();
        // All Ghost factories share this database connection
        this.db = options.database ?? createDatabase();
        
        // Initialize factories with shared database
        this.postFactory = new PostFactory(this.db);
    }
    
    async setup(): Promise<void> {
        await this.postFactory.setup();
    }
    
    async destroy(): Promise<void> {
        await this.postFactory.destroy();        
        await this.db.destroy();
    }
    
    /**
     * Get the shared database connection for cross-plugin operations or custom queries
     */
    getDatabase(): Knex {
        return this.db;
    }
    
    // Allows for ghost.posts.create() syntax
    get posts(): PostFactory {
        return this.postFactory;
    }
    
    // *
    // Convenience methods
    // *
    async createPost(options?: PostOptions): Promise<PostResult> {
        return this.postFactory.create(options);
    }
    
    async createPublishedPost(options?: PostOptions): Promise<PostResult> {
        return this.postFactory.create({
            status: 'published',
            published_at: options?.published_at || new Date(),
            ...options
        });
    }
    
    async createDraftPost(options?: PostOptions): Promise<PostResult> {
        return this.postFactory.create({
            status: 'draft',
            published_at: null,
            ...options
        });
    }
    
    async createScheduledPost(publishDate: Date, options?: PostOptions): Promise<PostResult> {
        return this.postFactory.create({
            status: 'scheduled',
            published_at: publishDate,
            ...options
        });
    }
    
    /**
     * Mixed composition methods - these will coordinate multiple factories
     * once we have tags, users, etc.
     */
    
    // Future: When we have tags
    // async createPostWithTags(
    //     postOptions?: PostOptions, 
    //     tagNames: string[] = ['default-tag']
    // ): Promise<{post: PostResult; tags: TagResult[]}> {
    //     const post = await this.createPost(postOptions);
    //     const tags = await Promise.all(
    //         tagNames.map(name => this.tagFactory.create({name}))
    //     );
    //     
    //     // Create relationships
    //     await this.db('posts_tags').insert(
    //         tags.map(tag => ({
    //             post_id: post.id,
    //             tag_id: tag.id
    //         }))
    //     );
    //     
    //     return {post, tags};
    // }
    
    // Future: When we have users/authors
    // async createAuthorWithPosts(
    //     authorOptions?: UserOptions,
    //     postCount = 3
    // ): Promise<{author: UserResult; posts: PostResult[]}> {
    //     const author = await this.userFactory.create(authorOptions);
    //     const posts = await Promise.all(
    //         Array(postCount).fill(null).map(() => 
    //             this.createPost({author_id: author.id})
    //         )
    //     );
    //     
    //     return {author, posts};
    // }
    
    getStats(): {posts: number} {
        return {
            posts: this.postFactory.getCreatedCount()
        };
    }
}