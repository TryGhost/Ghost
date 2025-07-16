import knex from 'knex';
import {faker} from '@faker-js/faker';
import {execSync} from 'child_process';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

export interface GhostSetupOptions {
    name?: string;
    email?: string;
    password?: string;
    blogTitle?: string;
    description?: string;
    accentColor?: string;
}

export interface GhostSetupResult {
    userId: string;
    email: string;
    blogTitle: string;
    setupComplete: boolean;
}

export class GhostSetup {
    private db: knex.Knex;

    constructor(db: knex.Knex) {
        this.db = db;
    }

    /**
     * Check if Ghost setup is complete by looking for an active owner user
     */
    async isSetupComplete(): Promise<boolean> {
        try {
            const owner = await this.db('users')
                .join('roles_users', 'users.id', 'roles_users.user_id')
                .join('roles', 'roles.id', 'roles_users.role_id')
                .where('roles.name', 'Owner')
                .where('users.status', 'active')
                .first();

            return !!owner;
        } catch (error) {
            return false;
        }
    }

    /**
     * Check if database needs initialization by looking for required tables
     */
    async needsInitialization(): Promise<boolean> {
        try {
            const hasUsersTable = await this.db.schema.hasTable('users');
            const hasRolesTable = await this.db.schema.hasTable('roles');
            const hasPostsTable = await this.db.schema.hasTable('posts');
            
            return !hasUsersTable || !hasRolesTable || !hasPostsTable;
        } catch (error) {
            return true;
        }
    }

    /**
     * Initialize database using knex-migrator (requires Ghost core)
     */
    async initializeDatabase(): Promise<void> {
        // Path to Ghost core directory
        const ghostCorePath = path.join(__dirname, '../../../ghost/core');
        
        try {
            // Run knex-migrator init from Ghost core directory
            execSync('npx knex-migrator init', {
                cwd: ghostCorePath,
                stdio: 'inherit',
                env: {
                    ...process.env,
                    NODE_ENV: 'development'
                }
            });
        } catch (error) {
            throw new Error('Failed to initialize database. Please ensure Ghost core is properly set up.');
        }
    }

    /**
     * Perform Ghost setup by activating the owner user and configuring the site
     */
    async performSetup(options: GhostSetupOptions = {}): Promise<GhostSetupResult> {
        const setupData = {
            name: options.name || faker.person.fullName(),
            email: options.email || 'test+admin@test.com',
            password: options.password || 'P4ssw0rd123$',
            blogTitle: options.blogTitle || faker.company.name(),
            description: options.description || faker.lorem.sentence(),
            accentColor: options.accentColor || '#FF6900'
        };

        // Check if setup is already complete
        if (await this.isSetupComplete()) {
            const owner = await this.getOwnerUser();
            return {
                userId: owner.id,
                email: owner.email,
                blogTitle: setupData.blogTitle,
                setupComplete: true
            };
        }

        // Get or create the owner user
        const ownerRole = await this.db('roles').where('name', 'Owner').first();
        if (!ownerRole) {
            throw new Error('Owner role not found. Database may need initialization.');
        }

        const owner = await this.db('users')
            .join('roles_users', 'users.id', 'roles_users.user_id')
            .where('roles_users.role_id', ownerRole.id)
            .select('users.*')
            .first();

        if (!owner) {
            throw new Error('Owner user not found. Database may need initialization.');
        }

        // Update owner user to active status
        const now = this.getMySQLDateTime();
        const hashedPassword = await this.hashPassword(setupData.password);
        await this.db('users')
            .where('id', owner.id)
            .update({
                name: setupData.name,
                email: setupData.email,
                password: hashedPassword,
                status: 'active',
                updated_at: now
            });

        // Update site settings
        await this.updateSettings([
            {key: 'title', value: setupData.blogTitle},
            {key: 'description', value: setupData.description},
            {key: 'accent_color', value: setupData.accentColor}
        ]);

        // Update default product name
        await this.updateDefaultProduct(setupData.blogTitle);

        return {
            userId: owner.id,
            email: setupData.email,
            blogTitle: setupData.blogTitle,
            setupComplete: true
        };
    }

    /**
     * Reset database to fresh state with minimal fixtures
     */
    async resetToFreshState(): Promise<void> {
        if (await this.needsInitialization()) {
            throw new Error('Database needs initialization. Cannot reset uninitialized database.');
        }

        // Clear all data except structure
        await this.db.raw('SET FOREIGN_KEY_CHECKS = 0');
        
        const tables = [
            'posts', 'posts_authors', 'posts_tags', 'posts_meta',
            'users', 'roles_users', 'user_permissions', 'permissions_users',
            'tags', 'settings', 'sessions', 'api_keys', 'webhooks',
            'integrations', 'tokens', 'invites', 'brute',
            'members', 'members_newsletters', 'members_products',
            'offers', 'offer_redemptions', 'products', 'stripe_products',
            'stripe_prices', 'benefits', 'products_benefits',
            'newsletters', 'email_batches', 'email_recipients',
            'comments', 'comment_likes', 'comment_reports',
            'mentions', 'redirects', 'custom_theme_settings'
        ];

        for (const table of tables) {
            try {
                await this.db(table).del();
            } catch (error) {
                // Table might not exist, continue
            }
        }

        await this.db.raw('SET FOREIGN_KEY_CHECKS = 1');

        // Insert minimal fixtures
        await this.insertMinimalFixtures();
    }

    /**
     * Ensure database is ready for tests (setup if needed)
     */
    async ensureReady(options: GhostSetupOptions = {}): Promise<GhostSetupResult> {
        if (await this.needsInitialization()) {
            await this.initializeDatabase();
        }

        if (await this.isSetupComplete()) {
            const owner = await this.getOwnerUser();
            return {
                userId: owner.id,
                email: owner.email,
                blogTitle: options.blogTitle || 'Test Site',
                setupComplete: true
            };
        }

        return await this.performSetup(options);
    }

    private async getOwnerUser() {
        return await this.db('users')
            .join('roles_users', 'users.id', 'roles_users.user_id')
            .join('roles', 'roles.id', 'roles_users.role_id')
            .where('roles.name', 'Owner')
            .select('users.*')
            .first();
    }

    private async hashPassword(password: string): Promise<string> {
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(password, salt);
    }

    private async updateSettings(settings: Array<{key: string, value: string}>) {
        for (const setting of settings) {
            await this.db('settings')
                .where('key', setting.key)
                .update({
                    value: setting.value,
                    updated_at: this.getMySQLDateTime()
                });
        }
    }

    private async updateDefaultProduct(name: string) {
        await this.db('products')
            .where('type', 'paid')
            .update({
                name: name,
                updated_at: this.getMySQLDateTime()
            });
    }

    private getMySQLDateTime(): string {
        return new Date().toISOString().slice(0, 19).replace('T', ' ');
    }

    private async insertMinimalFixtures() {
        const now = this.getMySQLDateTime();
        const uuid = () => crypto.randomUUID();

        // Insert roles
        const roles = [
            {id: '1', name: 'Administrator', description: 'Administrators'},
            {id: '2', name: 'Editor', description: 'Editors'},
            {id: '3', name: 'Author', description: 'Authors'},
            {id: '4', name: 'Contributor', description: 'Contributors'},
            {id: '5', name: 'Owner', description: 'Blog Owner'}
        ];

        for (const role of roles) {
            await this.db('roles').insert({
                ...role,
                created_at: now,
                updated_at: now
            });
        }

        // Insert inactive owner user
        const ownerId = '1';
        await this.db('users').insert({
            id: ownerId,
            name: 'Ghost',
            email: 'ghost@example.com',
            password: await this.hashPassword('password'),
            status: 'inactive',
            created_at: now,
            updated_at: now
        });

        // Assign owner role
        await this.db('roles_users').insert({
            id: '1',
            role_id: '5',
            user_id: ownerId
        });

        // Insert default settings
        const settings = [
            {key: 'title', value: 'Ghost'},
            {key: 'description', value: 'The professional publishing platform'},
            {key: 'accent_color', value: '#FF6900'},
            {key: 'active_theme', value: 'casper'}
        ];

        for (const setting of settings) {
            await this.db('settings').insert({
                ...setting,
                id: uuid(),
                type: 'blog',
                created_at: now,
                updated_at: now
            });
        }

        // Insert default products
        await this.db('products').insert([
            {
                id: uuid(),
                name: 'Free',
                slug: 'free',
                type: 'free',
                active: true,
                visibility: 'public',
                created_at: now,
                updated_at: now
            },
            {
                id: uuid(),
                name: 'Default Product',
                slug: 'default-product',
                type: 'paid',
                active: true,
                visibility: 'public',
                monthly_price: 500,
                yearly_price: 5000,
                currency: 'usd',
                created_at: now,
                updated_at: now
            }
        ]);
    }
}