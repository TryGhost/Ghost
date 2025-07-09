const { test, expect } = require('@playwright/test');
const FixtureClient = require('../lib/fixture-client');

test.describe('FixtureClient (DataGenerator Based)', () => {
    let fixtures;
    
    test.beforeAll(async () => {
        console.log('Initializing FixtureClient...');
        fixtures = new FixtureClient();
    });
    
    test('can create posts using DataGenerator', async () => {
        console.log('Testing post creation with DataGenerator...');
        
        // Create posts with all relations
        const posts = await fixtures.createPosts({ 
            count: 3,
            withTags: true,
            withAuthors: true 
        });
        
        console.log('Created posts:', posts.map(p => ({
            id: p.id,
            title: p.title,
            status: p.status
        })));
        
        // Verify posts were created
        expect(posts).toHaveLength(3);
        expect(posts[0]).toHaveProperty('id');
        expect(posts[0]).toHaveProperty('title');
        expect(posts[0]).toHaveProperty('slug');
        
        console.log('✅ DataGenerator-based post creation successful');
    });
    
    test('can create members using DataGenerator', async () => {
        console.log('Testing member creation with DataGenerator...');
        
        const members = await fixtures.createMembers({
            count: 5,
            withProducts: true
        });
        
        console.log('Created members:', members.map(m => ({
            id: m.id,
            email: m.email,
            status: m.status
        })));
        
        expect(members).toHaveLength(5);
        expect(members[0]).toHaveProperty('id');
        expect(members[0]).toHaveProperty('email');
        
        console.log('✅ DataGenerator-based member creation successful');
    });
    
    test('can create complete blog scenario', async () => {
        console.log('Testing complete blog scenario creation...');
        
        const result = await fixtures.createBlogScenario({
            posts: 10,
            members: 20,
            tags: 15,
            includeNewsletter: true
        });
        
        console.log('Blog scenario result:', result);
        
        expect(result).toHaveProperty('message');
        expect(result.message).toContain('Created blog scenario');
        
        console.log('✅ Complete blog scenario creation successful');
    });
    
    test('tracks created data', async () => {
        console.log('Testing data tracking...');
        
        const summary = fixtures.getCreatedSummary();
        console.log('Created data summary:', summary);
        
        // Should have data from previous tests
        expect(Array.isArray(summary)).toBe(true);
        
        console.log('✅ Data tracking working');
    });
});