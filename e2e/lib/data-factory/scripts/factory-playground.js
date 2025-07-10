#!/usr/bin/env node

/**
 * Playground script to demonstrate Ghost Data Factory usage
 */

const factory = require('../../factory');

async function demonstrateBasicUsage() {
    console.log('\n=== Basic Usage Demo ===\n');
    
    // Create a simple post
    const post = await factory.create('post', {
        title: 'My First Post',
        status: 'published'
    });
    console.log('Created post:', post.id, '-', post.title);
    
    // Create a member
    const member = await factory.create('member', {
        email: 'john@example.com',
        name: 'John Doe'
    });
    console.log('Created member:', member.id, '-', member.email);
}

async function demonstrateBuilders() {
    console.log('\n=== Builder Pattern Demo ===\n');
    
    // Using post builder
    const draftPost = await factory.posts()
        .withTitle('Draft Post')
        .asDraft()
        .create();
    console.log('Created draft post:', draftPost.id);
    
    const publishedPost = await factory.posts()
        .withTitle('Published Post')
        .withContent('This is the content')
        .asPublished()
        .create();
    console.log('Created published post:', publishedPost.id);
    
    // Using member builder
    const paidMember = await factory.members()
        .withEmail('premium@example.com')
        .withName('Premium User')
        .asPaidMember({cadence: 'month'})
        .create();
    console.log('Created paid member:', paidMember.id);
}

async function demonstrateRelationships() {
    console.log('\n=== Relationships Demo ===\n');
    
    // Create author
    const author = await factory.create('user', {
        email: 'author@example.com',
        name: 'Author Name'
    });
    console.log('Created author:', author.id, '-', author.name);
    
    // Create post with author
    const post = await factory.posts()
        .withTitle('Post with Author')
        .asPublished()
        .withAuthor(author.id)
        .create();
    console.log('Created post with author:', post.id);
    
    // Create post with tags
    const taggedPost = await factory.posts()
        .withTitle('Tagged Post')
        .withTags(['JavaScript', 'Tutorial'])
        .asPublished()
        .create();
    console.log('Created post with tags:', taggedPost.id);
}

async function demonstrateScenarios() {
    console.log('\n=== Complex Scenarios Demo ===\n');
    
    // Create a complete member with subscription
    const scenario = await factory.createMemberWithSubscription({
        member: {
            email: 'subscriber@example.com',
            name: 'Active Subscriber'
        },
        subscription: {
            cadence: 'yearly',
            status: 'active'
        }
    });
    console.log('Created subscription scenario:', scenario.member.id);
    
    // Create multiple posts
    const posts = await factory.createMultiple('post', 5, {
        status: 'published'
    });
    console.log('Created', posts.length, 'posts');
}

async function demonstrateQueries() {
    console.log('\n=== Query Demo ===\n');
    
    // Get random records
    const randomPost = await factory.getRandomRecord('posts', {status: 'published'});
    if (randomPost) {
        console.log('Random published post:', randomPost.id, '-', randomPost.title);
    }
    
    // Get records with conditions
    const members = await factory.getRecords('members', {status: 'paid'}, 5);
    console.log('Found', members.length, 'paid members');
}

async function main() {
    try {
        console.log('Ghost Data Factory Playground');
        console.log('=============================');
        
        // Initialize factory
        await factory.setupFactory({debug: false});
        
        // Run demonstrations
        await demonstrateBasicUsage();
        await demonstrateBuilders();
        await demonstrateRelationships();
        await demonstrateScenarios();
        await demonstrateQueries();
        
        console.log('\n=== Demo Complete ===\n');
        
        // Clean up
        await factory.cleanupFactory();
        process.exit(0);
    } catch (error) {
        console.error('\nError:', error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// Run the playground
main();