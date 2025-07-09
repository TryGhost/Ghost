const DataGenerator = require('../../ghost/core/core/server/data/seeders/DataGenerator');
const {getDatabaseConfig} = require('./database-config');
const schemaTables = require('../../ghost/core/core/server/data/schema').tables;

/**
 * FixtureClient that uses DataGenerator directly
 */
class FixtureClient {
    constructor(dbConfig = getDatabaseConfig()) {
        this.dbConfig = dbConfig;
        this.createdData = [];
    }
    
    /**
     * Create posts using DataGenerator
     */
    async createPosts({count = 1, withTags = true, withAuthors = true} = {}) {
        const knex = require('knex')(this.dbConfig);
        const dataGenerator = new DataGenerator({
            knex,
            schemaTables,
            tables: [
                {name: 'posts', quantity: count},
                ...(withTags ? [{name: 'tags', quantity: Math.min(count * 2, 10)}] : []),
                ...(withAuthors ? [{name: 'users', quantity: Math.min(count, 5)}] : []),
                ...(withTags ? [{name: 'posts_tags'}] : []),
                ...(withAuthors ? [{name: 'posts_authors'}] : [])
            ],
            clearDatabase: false,
            useTransaction: true,
            seed: Date.now(),
            logger: {
                info: (...args) => console.log('[DataGenerator]', ...args),
                debug: (...args) => console.log('[DataGenerator DEBUG]', ...args),
                error: (...args) => console.error('[DataGenerator ERROR]', ...args)
            }
        });
        
        await dataGenerator.importData();
        
        // Get the created posts
        const posts = await knex('posts')
            .orderBy('created_at', 'desc')
            .limit(count)
            .select('id', 'title', 'slug', 'status', 'published_at');
        
        await knex.destroy();
        
        this.createdData.push({type: 'posts', ids: posts.map(p => p.id)});
        
        return posts;
    }
    
    /**
     * Create members using DataGenerator
     */
    async createMembers({count = 1, withProducts = false} = {}) {
        const tables = [
            {name: 'members', quantity: count}
        ];
        
        if (withProducts) {
            tables.push(
                {name: 'products', quantity: 2},
                {name: 'members_products'}
            );
        }
        
        const knex = require('knex')(this.dbConfig);
        const dataGenerator = new DataGenerator({
            knex,
            schemaTables,
            tables,
            clearDatabase: false,
            useTransaction: true,
            seed: Date.now(),
            logger: {
                info: (...args) => console.log('[DataGenerator]', ...args),
                debug: (...args) => console.log('[DataGenerator DEBUG]', ...args),
                error: (...args) => console.error('[DataGenerator ERROR]', ...args)
            }
        });
        
        await dataGenerator.importData();
        
        // Get the created members
        const members = await knex('members')
            .orderBy('created_at', 'desc')
            .limit(count)
            .select('id', 'email', 'name', 'status');
        
        await knex.destroy();
        
        this.createdData.push({type: 'members', ids: members.map(m => m.id)});
        
        return members;
    }
    
    /**
     * Create a complete blog scenario
     */
    async createBlogScenario({ 
        posts = 5, 
        members = 10, 
        tags = 8,
        includeNewsletter = true 
    } = {}) {
        const tables = [
            {name: 'users', quantity: 3},
            {name: 'posts', quantity: posts},
            {name: 'tags', quantity: tags},
            {name: 'members', quantity: members},
            {name: 'posts_authors'},
            {name: 'posts_tags'}
        ];
        
        if (includeNewsletter) {
            tables.push(
                {name: 'newsletters', quantity: 2},
                {name: 'emails', quantity: Math.floor(posts / 2)}
            );
        }
        
        const knex = require('knex')(this.dbConfig);
        const dataGenerator = new DataGenerator({
            knex,
            schemaTables,
            tables,
            clearDatabase: false,
            useTransaction: true,
            seed: Date.now(),
            logger: {
                info: (...args) => console.log('[DataGenerator]', ...args),
                debug: (...args) => console.log('[DataGenerator DEBUG]', ...args),
                error: (...args) => console.error('[DataGenerator ERROR]', ...args)
            }
        });
        
        await dataGenerator.importData();
        
        await knex.destroy();
        
        return {
            message: `Created blog scenario with ${posts} posts, ${members} members, ${tags} tags`
        };
    }
    
    /**
     * Get summary of what was created
     */
    getCreatedSummary() {
        return this.createdData;
    }
    
    /**
     * Reset tracking (doesn't clean database)
     */
    reset() {
        this.createdData = [];
    }
}

module.exports = FixtureClient;