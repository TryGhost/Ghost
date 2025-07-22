import type {Knex} from 'knex';
import type {PostOptions, PostResult} from '../types';
import {PostFactory} from './post-factory';

/**
 * GhostFactory is a coordinator that manages all Ghost-related subfactories.
 * It does not extend Factory as it delegates to specialized factories.
 */
export class GhostFactory {
    name = 'ghost';
    private db: Knex;
    private postFactory: PostFactory;
    
    constructor(db: Knex) {
        this.db = db;
        this.postFactory = new PostFactory(db);
    }
    
    async setup(): Promise<void> {
        // Setup all subfactories
        await this.postFactory.setup();
        // Future: await this.userFactory.setup();
        // Future: await this.tagFactory.setup();
    }
    
    async destroy(): Promise<void> {
        // Destroy all subfactories
        await this.postFactory.destroy();
        // Don't destroy the db connection - it's managed by the singleton GhostDatabaseManager
    }
    
    // Post methods - delegate to PostFactory
    async createPost(options: PostOptions = {}): Promise<PostResult> {
        return this.postFactory.create(options);
    }
    
    async clearCreatedPosts(): Promise<void> {
        return this.postFactory.clearCreated();
    }
    
    getCreatedPostCount(): number {
        return this.postFactory.getCreatedCount();
    }
    
    // Future methods will follow the same pattern:
    // async createUser(options: UserOptions = {}): Promise<UserResult> {
    //     return this.userFactory.create(options);
    // }
    
    // async createTag(options: TagOptions = {}): Promise<TagResult> {
    //     return this.tagFactory.create(options);
    // }
    
    // Cross-entity methods can be added here
    // async createPostWithAuthor(authorOptions: UserOptions = {}, postOptions: PostOptions = {}): Promise<{user: UserResult, post: PostResult}> {
    //     const user = await this.userFactory.create(authorOptions);
    //     const post = await this.postFactory.create({
    //         ...postOptions,
    //         created_by: user.id,
    //         published_by: user.id
    //     });
    //     return {user, post};
    // }
}