import mysql from 'mysql2/promise';

export interface DatabaseConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
}

export class DatabaseFixture {
    private connection: mysql.Connection | null = null;
    private config: DatabaseConfig;

    constructor(config?: Partial<DatabaseConfig>) {
        this.config = {
            host: config?.host || process.env.MYSQL_HOST || 'localhost',
            port: config?.port || parseInt(process.env.MYSQL_PORT || '3306'),
            user: config?.user || process.env.MYSQL_USER || 'root',
            password: config?.password || process.env.MYSQL_PASSWORD || 'root',
            database: config?.database || process.env.MYSQL_DATABASE || 'ghost'
        };
    }

    async connect(): Promise<void> {
        this.connection = await mysql.createConnection(this.config);
    }

    async disconnect(): Promise<void> {
        if (this.connection) {
            await this.connection.end();
            this.connection = null;
        }
    }

    /**
     * Fast reset that only clears user-generated content
     * Keeps system data like roles intact
     */
    async fastReset(): Promise<void> {
        if (!this.connection) {
            throw new Error('Database connection not established');
        }

        await this.connection.query('SET FOREIGN_KEY_CHECKS = 0');

        // Only clear user-generated content, keep system data
        const contentTables = [
            'posts', 'posts_meta', 'posts_tags', 'posts_authors',
            'tags', 'members', 'members_products', 'members_stripe_customers',
            'members_stripe_customers_subscriptions', 'offers',
            'api_keys', 'tokens', 'sessions', 'webhooks'
        ];

        // Keep admin users but clear other users
        // First delete from roles_users
        await this.connection.execute(`
            DELETE FROM roles_users
            WHERE user_id NOT IN (
                SELECT user_id FROM (
                    SELECT ru2.user_id
                    FROM roles_users ru2
                    JOIN roles r ON ru2.role_id = r.id
                    WHERE r.name = 'Administrator'
                ) AS admin_users
            )
        `);

        // Then delete from users
        await this.connection.execute(`
            DELETE FROM users
            WHERE id NOT IN (
                SELECT user_id FROM (
                    SELECT ru.user_id
                    FROM roles_users ru
                    JOIN roles r ON ru.role_id = r.id
                    WHERE r.name = 'Administrator'
                ) AS admin_users
            )
        `);

        for (const table of contentTables) {
            try {
                await this.connection.execute(`TRUNCATE TABLE ${table}`);
            } catch (error) {
                // Fallback to DELETE if TRUNCATE fails
                await this.connection.execute(`DELETE FROM ${table}`);
            }
        }

        await this.connection.query('SET FOREIGN_KEY_CHECKS = 1');
    }
}
