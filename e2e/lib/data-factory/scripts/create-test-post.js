#!/usr/bin/env node

const factory = require('../../factory');

async function createTestPost() {
    try {
        console.log('Setting up factory...');
        await factory.setupFactory({debug: true});
        
        console.log('\nCreating test post...');
        const timestamp = Date.now();
        const post = await factory.posts()
            .withTitle(`Complete Test Post ${timestamp}`)
            .withContent('This post was created with the Ghost data factory and includes all required fields including author relationship.')
            .asPublished()
            .set('feature_image', 'https://static.ghost.org/v4.0.0/images/feature-image.jpg')
            .withAuthor('1')  // Link to the default user
            .create();
        
        console.log('\nPost created successfully!');
        console.log('Post ID:', post.id);
        console.log('Title:', post.title);
        console.log('Status:', post.status);
        console.log('Slug:', post.slug);
        console.log('Published at:', post.published_at);
        
        await factory.cleanupFactory();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

createTestPost();