/* eslint-disable no-console */
/**
 * Docker Database Utilities for Ghost Analytics Scripts
 * Provides database operations for the Docker-based development environment
 *
 * Connects directly to MySQL when running outside Docker (from host machine)
 */

const path = require('path');
const {NotFoundError} = require('@tryghost/errors');
class DockerDatabaseUtils {
    constructor(options = {}) {
        this.knex = null;
        this.initialized = false;
        this.options = {
            host: options.host || process.env.MYSQL_HOST || 'localhost',
            port: options.port || process.env.MYSQL_PORT || 3306,
            user: options.user || process.env.MYSQL_USER || 'root',
            password: options.password || process.env.MYSQL_PASSWORD || 'root',
            database: options.database || process.env.MYSQL_DATABASE || 'ghost_dev'
        };
    }

    /**
     * Initialize the knex connection to Docker MySQL
     */
    async init() {
        if (this.initialized) {
            return;
        }

        try {
            // Try to require knex from ghost/core where it's installed
            let knex;
            try {
                knex = require('knex');
            } catch (err) {
                // If running from monorepo root, require from ghost/core
                const ghostCorePath = path.resolve(__dirname, '..', '..', '..', '..', '..');
                knex = require(path.join(ghostCorePath, 'node_modules', 'knex'));
            }

            this.knex = knex({
                client: 'mysql2',
                connection: {
                    host: this.options.host,
                    port: this.options.port,
                    user: this.options.user,
                    password: this.options.password,
                    database: this.options.database
                },
                pool: {min: 0, max: 5}
            });

            // Test the connection
            await this.knex.raw('SELECT 1');

            this.initialized = true;
            console.log(`Database connection initialized (${this.options.host}:${this.options.port}/${this.options.database})`);
        } catch (error) {
            console.error('Failed to initialize database connection:', error.message);
            throw error;
        }
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
            return `/${slug}/`;
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
     * Get site UUID from settings
     */
    async getSiteUuid() {
        await this.init();

        try {
            const result = await this.knex('settings')
                .where('key', 'site_uuid')
                .select('value')
                .first();

            if (result && result.value) {
                return result.value;
            }

            throw new NotFoundError({message: 'site_uuid not found in settings'});
        } catch (error) {
            console.error('Error fetching site_uuid:', error.message);
            throw error;
        }
    }

    /**
     * Get site configuration including URL and UUID
     */
    async getSiteConfig() {
        await this.init();

        try {
            const settings = await this.knex('settings')
                .whereIn('key', ['title', 'description', 'url', 'site_uuid'])
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
}

module.exports = DockerDatabaseUtils;
