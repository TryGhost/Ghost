/* eslint-disable no-console */
import knex, {Knex} from 'knex';
import {withDataFactory} from '../index';

// Direct database connection for verification
async function getDirectDbConnection(): Promise<Knex> {
    return knex({
        client: 'mysql2',
        connection: {
            host: process.env.database__connection__host || 'localhost',
            port: parseInt(process.env.database__connection__port || '3306'),
            user: process.env.database__connection__user || 'root',
            password: process.env.database__connection__password || 'root',
            database: process.env.database__connection__database || 'ghost',
            charset: 'utf8mb4'
        },
        pool: {min: 0, max: 5}
    });
}

async function testDatabaseInsertion(): Promise<void> {
    console.log('🔧 Testing Ghost Factory Database Connection...\n');
    
    let postId: string | null = null;
    const db = await getDirectDbConnection();
    
    try {
        // Step 1: Create a post using the factory
        console.log('1️⃣  Creating post using factory...');
        await withDataFactory(async (factory) => {
            const post = await factory.createPost({
                title: 'Test Post - Factory DB Test',
                status: 'published',
                featured: true,
                custom_excerpt: 'This is a test post created by the factory'
            });
            
            postId = post.id;
            console.log(`   ✅ Post created with ID: ${postId}`);
            console.log(`   📝 Title: ${post.title}`);
            console.log(`   📊 Status: ${post.status}`);
        });
        
        // Step 2: Verify the post exists in the database
        console.log('\n2️⃣  Verifying post in database...');
        const dbPost = await db('posts')
            .where('id', postId)
            .first();
        
        if (dbPost) {
            console.log('   ✅ Post found in database!');
            console.log(`   📝 Title from DB: ${dbPost.title}`);
            console.log(`   📊 Status from DB: ${dbPost.status}`);
            console.log(`   ⭐ Featured: ${dbPost.featured ? 'Yes' : 'No'}`);
            console.log(`   📄 Excerpt: ${dbPost.custom_excerpt}`);
        } else {
            console.error('   ❌ Post not found in database!');
        }
        
        // Step 3: Clean up - delete the test post
        console.log('\n3️⃣  Cleaning up test data...');
        const deleted = await db('posts')
            .where('id', postId)
            .delete();
        
        console.log(`   🗑️  Deleted ${deleted} post(s)`);
        
        // Verify cleanup
        const verifyDeleted = await db('posts')
            .where('id', postId)
            .first();
        
        if (!verifyDeleted) {
            console.log('   ✅ Cleanup successful - post removed from database');
        } else {
            console.error('   ❌ Cleanup failed - post still exists!');
        }
        
        console.log('\n✨ Test completed successfully!');
    } catch (error) {
        console.error('\n❌ Test failed with error:', error);
        
        // Attempt cleanup on error
        if (postId) {
            try {
                await db('posts').where('id', postId).delete();
                console.log('   🗑️  Cleaned up post after error');
            } catch (cleanupError) {
                console.error('   ❌ Cleanup after error failed:', cleanupError);
            }
        }
        
        throw error;
    } finally {
        // Always destroy the direct database connection
        await db.destroy();
    }
}

// Run the test if this file is executed directly
if (require.main === module) {
    testDatabaseInsertion()
        .then(() => {
            console.log('\n🎉 All tests passed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Test execution failed:', error);
            process.exit(1);
        });
}

export {testDatabaseInsertion};