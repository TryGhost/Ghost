const factory = require('../../factory');

async function verifyPost(postId) {
    try {
        console.log('Setting up factory...');
        await factory.setupFactory({debug: false});
        
        const knex = factory.getFactory().knex;
        
        if (postId) {
            // Check specific post
            console.log(`\nLooking for post ${postId}...`);
            const post = await knex('posts').where('id', postId).first();
            
            if (post) {
                console.log('Found post!');
                console.log('Title:', post.title);
                console.log('Status:', post.status);
                console.log('Has HTML:', !!post.html);
                console.log('Has author:', !!(await knex('posts_authors').where('post_id', postId).first()));
                console.log('\nFull record:', JSON.stringify(post, null, 2));
            } else {
                console.log('Post not found');
            }
        } else {
            // List recent posts
            console.log('\nRecent posts:');
            const posts = await knex('posts')
                .select('id', 'title', 'slug', 'status', 'visibility', 'type', 'published_at')
                .orderBy('created_at', 'desc')
                .limit(10);
            
            posts.forEach(post => {
                console.log(`- ${post.id}: "${post.title}" (${post.status})`);
            });
        }
        
        await factory.cleanupFactory();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Run with optional post ID argument
const postId = process.argv[2];
verifyPost(postId);