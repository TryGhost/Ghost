import type {Knex} from 'knex';
import {BasePlugin} from './base-plugin';
import {createDatabase} from '../utils/database';
import {PostFactory, PostOptions, PostResult} from '../factories/post-factory';
import {
    KnexPersistenceAdapter,
    PersistenceAdapter,
    EntityRegistry, DatabaseMetadata
} from '../persistence';

export interface GhostPluginOptions {
    database?: Knex;
    persistence?: PersistenceAdapter;
}

/**
 * Ghost plugin that coordinates all Ghost-related factories
 * with persistence abstraction
 */
export class GhostPlugin extends BasePlugin {
    readonly name = 'ghost';

    private readonly db: Knex;
    postFactory: PostFactory;

    constructor(options: GhostPluginOptions = {}) {
        super();

        // Set up database connection
        this.db = options.database ?? createDatabase();

        // Set up persistence (use provided or create default)
        if (options.persistence) {
            this.setPersistenceAdapter(options.persistence);
        } else {
            this.setPersistenceAdapter(this.createDefaultPersistence());
        }

        // Create and register factories
        this.postFactory = this.registerFactory(new PostFactory());
    }

    private createDefaultPersistence(): PersistenceAdapter {
        const registry = new EntityRegistry<DatabaseMetadata>();
        registry.register('posts', {
            tableName: 'posts'
        });

        return new KnexPersistenceAdapter(this.db, registry);
    }

    async setup(): Promise<void> {
        // Setup all factories
        for (const factory of this.factories.values()) {
            await factory.setup();
        }
    }

    /**
     * Get the shared database connection for custom queries
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
            ...options,
            status: 'published',
            published_at: options?.published_at || new Date()
        });
    }

    async createDraftPost(options?: PostOptions): Promise<PostResult> {
        return this.postFactory.create({
            ...options,
            status: 'draft',
            published_at: null
        });
    }

    async createScheduledPost(publishDate: Date, options?: PostOptions): Promise<PostResult> {
        return this.postFactory.create({
            ...options,
            status: 'scheduled',
            published_at: publishDate
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

    /**
     * Get statistics about created entities
     */
    getStats(): {posts: number} {
        const baseStats = super.getStats();
        return {
            posts: baseStats.post || 0
        };
    }

    /**
     * Clean up and close database connection
     */
    async destroy(): Promise<void> {
        // Clean up all factories
        await super.destroy();

        // Close database connection
        await this.db.destroy();
    }
}
