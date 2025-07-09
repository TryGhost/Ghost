const { test, expect } = require('@playwright/test');
const { getDatabaseConfig } = require('../lib/database-config');
const knex = require('knex');

test.describe('Database Connection Tests', () => {
    let db;
    
    test.beforeAll(async () => {
        const config = getDatabaseConfig();
        db = knex(config);
    });
    
    test.afterAll(async () => {
        if (db) {
            await db.destroy();
        }
    });
    
    test('can connect to Ghost database', async () => {
        console.log('Testing basic database connection...');
        
        // Test basic connection
        const result = await db.raw('SELECT 1 as test');
        expect(result).toBeDefined();
        expect(result[0]).toBeDefined();
        expect(result[0][0].test).toBe(1);
        
        console.log('✅ Database connection successful');
    });
    
    test('Ghost tables exist', async () => {
        console.log('Checking for Ghost tables...');
        
        // Check if key Ghost tables exist
        const tables = await db.raw(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() 
            AND table_name IN ('posts', 'users', 'members', 'products', 'tags')
        `);
        
        const tableNames = tables[0].map(row => row.table_name);
        console.log('Found tables:', tableNames);
        
        // Verify we have the essential tables
        expect(tableNames).toContain('posts');
        expect(tableNames).toContain('users');
        expect(tableNames).toContain('members');
        
        console.log('✅ Ghost tables found');
    });
    
    test('can read existing data', async () => {
        console.log('Testing data read operations...');
        
        // Try to read some basic data
        const users = await db('users').select('id', 'name', 'email').limit(5);
        const posts = await db('posts').select('id', 'title', 'status').limit(5);
        const products = await db('products').select('id', 'name', 'slug').limit(5);
        
        console.log('Found users:', users.length);
        console.log('Found posts:', posts.length);
        console.log('Found products:', products.length);
        
        // Should have at least some data
        expect(users.length).toBeGreaterThan(0);
        expect(products.length).toBeGreaterThan(0);
        
        // Log sample data
        if (users.length > 0) {
            console.log('Sample user:', users[0]);
        }
        if (posts.length > 0) {
            console.log('Sample post:', posts[0]);
        }
        if (products.length > 0) {
            console.log('Sample product:', products[0]);
        }
        
        console.log('✅ Data read operations successful');
    });
    
    test('database structure matches expectations', async () => {
        console.log('Verifying database structure...');
        
        // Check posts table structure
        const postsColumns = await db.raw(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_schema = DATABASE() 
            AND table_name = 'posts'
            ORDER BY ordinal_position
        `);
        
        const columnNames = postsColumns[0].map(col => col.column_name);
        console.log('Posts table columns:', columnNames.slice(0, 10)); // Show first 10
        
        // Verify key columns exist
        expect(columnNames).toContain('id');
        expect(columnNames).toContain('title');
        expect(columnNames).toContain('slug');
        expect(columnNames).toContain('status');
        expect(columnNames).toContain('published_at');
        
        console.log('✅ Database structure validation passed');
    });
    
    test('can perform basic queries', async () => {
        console.log('Testing query operations...');
        
        // Test various query types
        const totalUsers = await db('users').count('id as count').first();
        const totalPosts = await db('posts').count('id as count').first();
        const publishedPosts = await db('posts').where('status', 'published').count('id as count').first();
        
        console.log('Total users:', totalUsers.count);
        console.log('Total posts:', totalPosts.count);
        console.log('Published posts:', publishedPosts.count);
        
        expect(Number(totalUsers.count)).toBeGreaterThanOrEqual(0);
        expect(Number(totalPosts.count)).toBeGreaterThanOrEqual(0);
        expect(Number(publishedPosts.count)).toBeGreaterThanOrEqual(0);
        
        console.log('✅ Query operations successful');
    });
});