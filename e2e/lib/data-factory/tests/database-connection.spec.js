const {test, expect} = require('@playwright/test');
const factoryLib = require('../../factory');

test.describe('Database Connection Tests', () => {
    let db;
    let factory;
    
    test.beforeAll(async () => {
        await factoryLib.setupFactory();
        factory = factoryLib.getFactory();
        db = factory.knex;
    });
    
    test.afterAll(async () => {
        
    });
    
    test('can connect to Ghost database', async () => {
        // Test basic connection
        const result = await db.raw('SELECT 1 as test');
        expect(result).toBeDefined();
        expect(result[0]).toBeDefined();
        expect(result[0][0].test).toBe(1);
    });
    
    test('Ghost tables exist', async () => {
        // Check if key Ghost tables exist
        const tables = await db.raw(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() 
            AND table_name IN ('posts', 'users', 'members', 'products', 'tags')
        `);
        
        // Handle both lowercase and uppercase column names (MySQL compatibility)
        const tableNames = tables[0].map(row => row.table_name || row.TABLE_NAME);
        
        // Verify we have the essential tables
        expect(tableNames).toContain('posts');
        expect(tableNames).toContain('users');
        expect(tableNames).toContain('members');
        expect(tableNames).toContain('products');
        expect(tableNames).toContain('tags');
    });
    
    test('can read existing data', async () => {
        // Try to read some basic data
        const users = await db('users').select('id', 'name', 'email').limit(5);
        const posts = await db('posts').select('id', 'title', 'status').limit(5);
        const products = await db('products').select('id', 'name', 'slug').limit(5);
        
        // Should have at least some data
        expect(users.length).toBeGreaterThan(0);
        expect(products.length).toBeGreaterThan(0);
        
        // Verify data structure
        if (users.length > 0) {
            expect(users[0]).toHaveProperty('id');
            expect(users[0]).toHaveProperty('name');
            expect(users[0]).toHaveProperty('email');
        }
        if (posts.length > 0) {
            expect(posts[0]).toHaveProperty('id');
            expect(posts[0]).toHaveProperty('title');
            expect(posts[0]).toHaveProperty('status');
        }
        if (products.length > 0) {
            expect(products[0]).toHaveProperty('id');
            expect(products[0]).toHaveProperty('name');
            expect(products[0]).toHaveProperty('slug');
        }
    });
    
    test('database structure matches expectations', async () => {
        // Check posts table structure
        const postsColumns = await db.raw(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_schema = DATABASE() 
            AND table_name = 'posts'
            ORDER BY ordinal_position
        `);
        
        // Handle both lowercase and uppercase column names (MySQL compatibility)
        const columnNames = postsColumns[0].map(col => col.column_name || col.COLUMN_NAME);
        
        // Verify key columns exist
        expect(columnNames).toContain('id');
        expect(columnNames).toContain('uuid');
        expect(columnNames).toContain('title');
        expect(columnNames).toContain('slug');
        expect(columnNames).toContain('status');
        expect(columnNames).toContain('published_at');
        expect(columnNames).toContain('created_at');
        expect(columnNames).toContain('updated_at');
    });
    
    test('can perform basic queries', async () => {
        // Test various query types
        const totalUsers = await db('users').count('id as count').first();
        const totalPosts = await db('posts').count('id as count').first();
        const publishedPosts = await db('posts').where('status', 'published').count('id as count').first();
        
        expect(totalUsers).toBeDefined();
        expect(totalPosts).toBeDefined();
        expect(publishedPosts).toBeDefined();
        
        expect(Number(totalUsers.count)).toBeGreaterThanOrEqual(0);
        expect(Number(totalPosts.count)).toBeGreaterThanOrEqual(0);
        expect(Number(publishedPosts.count)).toBeGreaterThanOrEqual(0);
        expect(Number(publishedPosts.count)).toBeLessThanOrEqual(Number(totalPosts.count));
    });
});