/* eslint-disable ghost/filenames/match-exported-class */
/* eslint-disable no-console */
/**
 * Database Utilities for Ghost Analytics Scripts
 * Provides common database operations for fixture generation
 */

const path = require('path');

class DatabaseUtils {
    constructor() {
        this.knex = null;
        this.initialized = false;
    }

    /**
     * Initialize the knex connection
     */
    async init() {
        if (this.initialized) {
            return;
        }
        
        try {
            // Try different connection paths depending on where we're running from
            let connectionPath;
            
            // If running from ghost/core directory (like query scripts do)
            if (process.cwd().endsWith('ghost/core')) {
                connectionPath = path.resolve(process.cwd(), 'core/server/data/db/connection');
            } else {
                // If running from scripts directory
                connectionPath = path.resolve(__dirname, '../../db/connection');
            }
            
            this.knex = require(connectionPath);
            this.initialized = true;
            console.log('Database connection initialized');
        } catch (error) {
            console.error('Failed to initialize database connection:', error.message);
            throw error;
        }
    }

    /**
     * Get all post UUIDs from the database
     */
    async getPostUuids(options = {}) {
        await this.init();
        
        const {
            status = null,
            type = 'post',
            limit = null,
            publishedOnly = false
        } = options;

        let query = this.knex('posts').select('uuid');

        if (status) {
            query = query.where('status', status);
        }

        if (type) {
            query = query.where('type', type);
        }

        if (publishedOnly) {
            query = query.where('status', 'published');
        }

        if (limit) {
            query = query.limit(limit);
        }

        const results = await query;
        return results.map(row => row.uuid);
    }

    /**
     * Get post details including UUIDs, titles, and other metadata
     */
    async getPostDetails(options = {}) {
        await this.init();
        
        const {
            status = null,
            type = 'post',
            limit = null,
            fields = ['uuid', 'title', 'slug', 'status', 'type', 'created_at', 'published_at']
        } = options;

        let query = this.knex('posts').select(fields);

        if (status) {
            query = query.where('status', status);
        }

        if (type) {
            query = query.where('type', type);
        }

        if (limit) {
            query = query.limit(limit);
        }

        return await query.orderBy('created_at', 'desc');
    }

    /**
     * Get posts with detailed information including published dates and slugs
     */
    async getPostsWithDetails(options = {}) {
        await this.init();
        
        const {publishedOnly = true, limit = null} = options;
        
        let query = this.knex('posts').select([
            'uuid',
            'slug', 
            'type',
            'published_at',
            'status'
        ]);
        
        if (publishedOnly) {
            query = query.where('status', 'published');
        }
        
        query = query.orderBy('published_at', 'desc');
        
        if (limit) {
            query = query.limit(limit);
        }
        
        try {
            const rows = await query;
            
            // Transform the data to include pathname
            return rows.map(row => ({
                uuid: row.uuid,
                slug: row.slug,
                type: row.type,
                published_at: row.published_at,
                pathname: this.generatePathname(row.type, row.slug)
            }));
        } catch (error) {
            console.error('Error fetching posts with details:', error);
            throw error;
        }
    }

    /**
     * Generate pathname based on post type and slug
     */
    generatePathname(type, slug) {
        if (type === 'post') {
            return `/blog/${slug}/`;
        } else if (type === 'page') {
            return `/${slug}/`;
        }
        return `/${slug}/`;
    }

    /**
     * Get member UUIDs (if members exist)
     */
    async getMemberUuids(options = {}) {
        await this.init();
        
        const {limit = null, status = null} = options;

        let query = this.knex('members').select('uuid');

        if (status) {
            query = query.where('status', status);
        }

        if (limit) {
            query = query.limit(limit);
        }

        const results = await query;
        return results.map(row => row.uuid);
    }

    /**
     * Get site configuration
     */
    async getSiteConfig() {
        await this.init();
        
        try {
            const settings = await this.knex('settings')
                .whereIn('key', ['title', 'description', 'url', 'ghost_head', 'ghost_foot'])
                .select('key', 'value');
            
            const config = {};
            settings.forEach((setting) => {
                config[setting.key] = setting.value;
            });
            
            return config;
        } catch (error) {
            console.warn('Could not fetch site config:', error.message);
            return {};
        }
    }

    /**
     * Get database statistics
     */
    async getStats() {
        await this.init();
        
        try {
            const [posts, members, pages] = await Promise.all([
                this.knex('posts').where('type', 'post').count('* as count').first(),
                this.knex('members').count('* as count').first().catch(() => ({count: 0})),
                this.knex('posts').where('type', 'page').count('* as count').first()
            ]);

            return {
                posts: parseInt(posts.count),
                members: parseInt(members.count),
                pages: parseInt(pages.count)
            };
        } catch (error) {
            console.warn('Could not fetch database stats:', error.message);
            return {posts: 0, members: 0, pages: 0};
        }
    }

    /**
     * Close the database connection
     */
    async close() {
        if (this.knex && this.initialized) {
            await this.knex.destroy();
            this.initialized = false;
            console.log('Database connection closed');
        }
    }

    /**
     * Execute a raw SQL query (for advanced use cases)
     */
    async raw(sql, bindings = []) {
        await this.init();
        return await this.knex.raw(sql, bindings);
    }
}

module.exports = DatabaseUtils; 