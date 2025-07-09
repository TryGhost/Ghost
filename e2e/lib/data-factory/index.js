const BaseFactory = require('./base-factory');
const MemberBuilder = require('./builders/member-builder');
const PostBuilder = require('./builders/post-builder');

/**
 * DataFactory provides the main API for creating test data
 */
class DataFactory extends BaseFactory {
    constructor(knex, schema, options = {}) {
        super(knex, schema, options);
    }

    /**
     * Create a new member builder
     */
    members() {
        return new MemberBuilder(this);
    }

    /**
     * Create a new post builder
     */
    posts() {
        return new PostBuilder(this);
    }

    /**
     * Direct member creation with options
     */
    async createMember(data = {}) {
        return this.members().setMany(data).create();
    }

    /**
     * Create a paid member with subscription
     */
    async createPaidMember(options = {}) {
        const {
            email,
            name,
            createdAt,
            tier,
            cadence = 'month',
            startDate = new Date(),
            ...otherData
        } = options;

        const builder = this.members();
        
        if (email) builder.withEmail(email);
        if (name) builder.withName(name);
        if (createdAt) builder.withCreatedAt(createdAt);
        
        builder.setMany(otherData);
        
        await builder.asPaidMember({
            tier,
            cadence,
            startDate
        });
        
        return builder.create();
    }

    /**
     * Create a free member
     */
    async createFreeMember(options = {}) {
        const { email, name, createdAt, ...otherData } = options;
        
        const builder = this.members();
        
        if (email) builder.withEmail(email);
        if (name) builder.withName(name);
        if (createdAt) builder.withCreatedAt(createdAt);
        
        builder.setMany(otherData);
        builder.asFreeMember();
        
        return builder.create();
    }

    /**
     * Create a comped member
     */
    async createCompedMember(options = {}) {
        const { email, name, createdAt, tier, ...otherData } = options;
        
        const builder = this.members();
        
        if (email) builder.withEmail(email);
        if (name) builder.withName(name);
        if (createdAt) builder.withCreatedAt(createdAt);
        
        builder.setMany(otherData);
        builder.asCompedMember(tier);
        
        return builder.create();
    }

    /**
     * Create multiple members
     */
    async createMembers(count, options = {}) {
        const members = [];
        
        for (let i = 0; i < count; i++) {
            const member = await this.createMember(options);
            members.push(member);
        }
        
        return members;
    }

    /**
     * Create a test scenario with paid members
     */
    async createPaidMemberScenario({
        memberCount = 5,
        tier = null,
        startDate = new Date(),
        cadence = 'month'
    } = {}) {
        const members = [];
        
        // Create the tier if not provided
        if (!tier) {
            // Try to find existing tier first
            tier = await this.knex('products')
                .where('slug', 'premium-tier')
                .first();
            
            if (!tier) {
                tier = await this.insert('products', {
                    name: 'Premium Tier',
                    slug: 'premium-tier',
                    type: 'paid',
                    active: true,
                    visibility: 'public',
                    welcome_page_url: '/welcome-premium'
                });
            }
        }
        
        // Create members with staggered join dates
        for (let i = 0; i < memberCount; i++) {
            const joinDate = new Date(startDate);
            joinDate.setDate(joinDate.getDate() - (i * 7)); // Stagger by weeks
            
            const member = await this.createPaidMember({
                createdAt: joinDate,
                tier,
                cadence,
                startDate: joinDate
            });
            
            members.push(member);
        }
        
        return {
            tier,
            members
        };
    }

    /**
     * Create a published post
     */
    async createPublishedPost(options = {}) {
        const { title, content, publishedAt = new Date(), author, tags, ...otherData } = options;
        
        const builder = this.posts();
        
        if (title) builder.withTitle(title);
        if (content) builder.withContent(content);
        if (author) builder.withAuthor(author);
        if (tags) builder.withTags(tags);
        
        builder.setMany(otherData);
        builder.asPublished(publishedAt);
        
        return builder.create();
    }

    /**
     * Create a draft post
     */
    async createDraftPost(options = {}) {
        const { title, content, author, tags, ...otherData } = options;
        
        const builder = this.posts();
        
        if (title) builder.withTitle(title);
        if (content) builder.withContent(content);
        if (author) builder.withAuthor(author);
        if (tags) builder.withTags(tags);
        
        builder.setMany(otherData);
        builder.asDraft();
        
        return builder.create();
    }

    /**
     * Create a sent post (newsletter)
     */
    async createSentPost(options = {}) {
        const { title, content, sentAt = new Date(), author, tags, ...otherData } = options;
        
        // Find default newsletter
        const newsletter = await this.knex('newsletters')
            .where('status', 'active')
            .first();
            
        const builder = this.posts();
        
        if (title) builder.withTitle(title);
        if (content) builder.withContent(content);
        if (author) builder.withAuthor(author);
        if (tags) builder.withTags(tags);
        if (newsletter) builder.set('newsletter_id', newsletter.id);
        
        builder.setMany(otherData);
        builder.asSent(sentAt);
        builder.withNewsletter();
        
        return builder.create();
    }

    /**
     * Create a published post that was also sent as newsletter
     */
    async createPublishedAndSentPost(options = {}) {
        const { title, content, publishedAt = new Date(), author, tags, ...otherData } = options;
        
        // Find default newsletter
        const newsletter = await this.knex('newsletters')
            .where('status', 'active')
            .first();
            
        const builder = this.posts();
        
        if (title) builder.withTitle(title);
        if (content) builder.withContent(content);
        if (author) builder.withAuthor(author);
        if (tags) builder.withTags(tags);
        if (newsletter) builder.set('newsletter_id', newsletter.id);
        
        builder.setMany(otherData);
        builder.asPublishedAndSent(publishedAt);
        
        return builder.create();
    }

    /**
     * Reset database by truncating tables
     * WARNING: This will delete ALL data in the specified tables
     */
    async resetDatabase(options = {}) {
        const {
            tables = ['posts', 'members', 'tags', 'users', 'products', 'newsletters'],
            preserveTables = ['migrations', 'migrations_lock', 'settings'],
            cascade = false
        } = options;
        
        try {
            // Disable foreign key checks for MySQL
            if (this.knex.client.config.client === 'mysql2') {
                await this.knex.raw('SET FOREIGN_KEY_CHECKS = 0');
            }
            
            // Get all tables if 'all' is specified
            let tablesToReset = tables;
            if (tables.includes('all')) {
                const allTables = await this.knex.raw(`
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = DATABASE()
                `);
                tablesToReset = allTables[0]
                    .map(row => row.table_name || row.TABLE_NAME)
                    .filter(table => !preserveTables.includes(table));
            }
            
            // Truncate tables
            for (const table of tablesToReset) {
                try {
                    if (cascade) {
                        // Delete with cascade (slower but handles foreign keys)
                        await this.knex(table).delete();
                    } else {
                        // Truncate (faster but may fail with foreign keys)
                        await this.knex.raw(`TRUNCATE TABLE ${table}`);
                    }
                    // Table reset successful
                } catch (error) {
                    // Skip table if it doesn't exist or has FK constraints
                }
            }
            
            // Re-enable foreign key checks
            if (this.knex.client.config.client === 'mysql2') {
                await this.knex.raw('SET FOREIGN_KEY_CHECKS = 1');
            }
            
            // Database reset complete
            
        } catch (error) {
            // Re-throw error
            throw error;
        }
    }
    
    /**
     * Reset specific tables in the correct order to handle foreign keys
     */
    async resetTables(tableList) {
        // Define dependency order (dependent tables first)
        const tableOrder = [
            'members_paid_subscription_events',
            'members_stripe_customers_subscriptions', 
            'members_stripe_customers',
            'members_products',
            'members_labels',
            'members_newsletters',
            'members',
            'posts_tags',
            'posts_authors',
            'posts_meta',
            'emails',
            'posts',
            'tags',
            'labels',
            'products',
            'newsletters'
        ];
        
        // Filter to only requested tables
        const tablesToReset = tableOrder.filter(table => tableList.includes(table));
        
        try {
            // Disable foreign key checks
            if (this.knex.client.config.client === 'mysql2') {
                await this.knex.raw('SET FOREIGN_KEY_CHECKS = 0');
            }
            
            for (const table of tablesToReset) {
                try {
                    await this.knex(table).truncate();
                } catch (error) {
                    // Try delete if truncate fails
                    await this.knex(table).delete();
                }
            }
            
            // Re-enable foreign key checks
            if (this.knex.client.config.client === 'mysql2') {
                await this.knex.raw('SET FOREIGN_KEY_CHECKS = 1');
            }
            
        } catch (error) {
            // Re-throw error
            throw error;
        }
    }
    
    /**
     * Reset member-related tables
     * Useful when you need to clean member data completely
     */
    async resetMemberTables() {
        const memberTables = [
            'members_subscribe_events',
            'members_paid_subscription_events',
            'members_stripe_customers_subscriptions',
            'members_stripe_customers',
            'members_products',
            'members_labels',
            'members_newsletters',
            'members'
        ];
        
        return this.resetDatabase({
            tables: memberTables,
            cascade: true
        });
    }
    
    /**
     * Reset post-related tables
     * Useful when you need to clean post data completely
     */
    async resetPostTables() {
        const postTables = [
            'posts_tags',
            'posts_authors',
            'posts_meta',
            'emails',
            'posts'
        ];
        
        return this.resetDatabase({
            tables: postTables,
            cascade: true
        });
    }
    
    /**
     * Reset the database to a clean state
     * This is a convenience alias for resetDatabase with all tables
     */
    async resetDb() {
        return this.resetDatabase({ tables: ['all'] });
    }
    
    /**
     * Clean up entities by IDs
     * @param {string} entityType - The entity type ('posts', 'members', 'tags', etc.)
     * @param {Array<string|Object>} entities - Array of entity IDs or entity objects with id property
     * @returns {Promise<number>} Number of deleted rows
     */
    async cleanUp(entityType, entities) {
        if (!entities || entities.length === 0) {
            return 0;
        }
        
        // Extract IDs from entities (handle both ID arrays and object arrays)
        const ids = entities.map(entity => {
            if (typeof entity === 'string') {
                return entity;
            }
            return entity.id || entity;
        }).filter(Boolean);
        
        if (ids.length === 0) {
            return 0;
        }
        
        // Handle dependent tables based on entity type
        try {
            switch (entityType) {
                case 'posts':
                    // Clean up dependent tables first
                    await this.knex('posts_tags').whereIn('post_id', ids).delete();
                    await this.knex('posts_authors').whereIn('post_id', ids).delete();
                    await this.knex('posts_meta').whereIn('post_id', ids).delete();
                    await this.knex('emails').whereIn('post_id', ids).delete();
                    // Then clean up posts
                    return await this.knex('posts').whereIn('id', ids).delete();
                    
                case 'members':
                    // Clean up dependent tables first
                    await this.knex('members_subscribe_events').whereIn('member_id', ids).delete();
                    await this.knex('members_paid_subscription_events').whereIn('member_id', ids).delete();
                    await this.knex('members_stripe_customers_subscriptions')
                        .whereIn('customer_id', function() {
                            this.select('id').from('members_stripe_customers').whereIn('member_id', ids);
                        })
                        .delete();
                    await this.knex('members_stripe_customers').whereIn('member_id', ids).delete();
                    await this.knex('members_products').whereIn('member_id', ids).delete();
                    await this.knex('members_labels').whereIn('member_id', ids).delete();
                    await this.knex('members_newsletters').whereIn('member_id', ids).delete();
                    // Then clean up members
                    return await this.knex('members').whereIn('id', ids).delete();
                    
                case 'tags':
                    // Clean up dependent tables first
                    await this.knex('posts_tags').whereIn('tag_id', ids).delete();
                    // Then clean up tags
                    return await this.knex('tags').whereIn('id', ids).delete();
                    
                case 'users':
                    // Clean up dependent tables first
                    await this.knex('posts_authors').whereIn('author_id', ids).delete();
                    // Update posts to remove primary author reference
                    await this.knex('posts').whereIn('author_id', ids).update({ author_id: null });
                    // Then clean up users
                    return await this.knex('users').whereIn('id', ids).delete();
                    
                case 'products':
                case 'tiers':
                    // Clean up dependent tables first
                    await this.knex('members_products').whereIn('product_id', ids).delete();
                    await this.knex('stripe_products').whereIn('product_id', ids).delete();
                    await this.knex('stripe_prices').whereIn('stripe_product_id', function() {
                        this.select('id').from('stripe_products').whereIn('product_id', ids);
                    }).delete();
                    // Then clean up products
                    return await this.knex('products').whereIn('id', ids).delete();
                    
                case 'newsletters':
                    // Update posts to remove newsletter reference
                    await this.knex('posts').whereIn('newsletter_id', ids).update({ newsletter_id: null });
                    await this.knex('members_newsletters').whereIn('newsletter_id', ids).delete();
                    // Then clean up newsletters
                    return await this.knex('newsletters').whereIn('id', ids).delete();
                    
                default:
                    // For other entity types, just delete directly
                    return await this.knex(entityType).whereIn('id', ids).delete();
            }
        } catch (error) {
            this.logger.error(`Error cleaning up ${entityType}:`, error);
            throw error;
        }
    }
    
    /**
     * Clean up multiple entity types at once
     * @param {Object} entitiesToClean - Object with entity types as keys and arrays of entities as values
     * @returns {Promise<Object>} Object with entity types as keys and number of deleted rows as values
     */
    async cleanUpBatch(entitiesToClean) {
        const results = {};
        
        // Define cleanup order to handle dependencies
        const cleanupOrder = [
            'emails',
            'posts',
            'members', 
            'tags',
            'users',
            'products',
            'tiers',
            'newsletters'
        ];
        
        // Clean up in order
        for (const entityType of cleanupOrder) {
            if (entitiesToClean[entityType]) {
                results[entityType] = await this.cleanUp(entityType, entitiesToClean[entityType]);
            }
        }
        
        // Clean up any other entity types not in the order
        for (const [entityType, entities] of Object.entries(entitiesToClean)) {
            if (!cleanupOrder.includes(entityType) && !results[entityType]) {
                results[entityType] = await this.cleanUp(entityType, entities);
            }
        }
        
        return results;
    }
}

/**
 * Create a new DataFactory instance
 */
function createDataFactory(knex, schema, options = {}) {
    return new DataFactory(knex, schema, options);
}

module.exports = {
    DataFactory,
    createDataFactory
};