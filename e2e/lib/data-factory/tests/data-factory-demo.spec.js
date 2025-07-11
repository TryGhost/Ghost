const {test, expect} = require('@playwright/test');
const factoryLib = require('../../factory');

test.describe('E2E Data Factory Demo', () => {
    let db;
    let factory;
    const createdData = {
        members: [],
        posts: [],
        users: [],
        labels: []
    };
    
    test.beforeAll(async () => {
        await factoryLib.setupFactory();
        factory = factoryLib.getFactory();
        db = factory.knex;
    });
    
    test.afterEach(async () => {
        // Clean up in reverse order of dependencies
        if (createdData.posts.length > 0) {
            await db('posts_tags').whereIn('post_id', createdData.posts).delete();
            await db('posts_authors').whereIn('post_id', createdData.posts).delete();
            await db('emails').whereIn('post_id', createdData.posts).delete();
            await db('posts').whereIn('id', createdData.posts).delete();
            createdData.posts = [];
        }
        
        if (createdData.members.length > 0) {
            await db('members_labels').whereIn('member_id', createdData.members).delete();
            await db('members_stripe_customers').whereIn('member_id', createdData.members).delete();
            await db('members').whereIn('id', createdData.members).delete();
            createdData.members = [];
        }
        
        if (createdData.labels.length > 0) {
            // First delete member-label relationships
            await db('members_labels').whereIn('label_id', createdData.labels).delete();
            await db('labels').whereIn('id', createdData.labels).delete();
            createdData.labels = [];
        }
        
        if (createdData.users.length > 0) {
            await db('users').whereIn('id', createdData.users).delete();
            createdData.users = [];
        }
    });
    
    test.afterAll(async () => {
        
    });

    test('demonstrates creating different types of members', async () => {
        // Create a free member
        const freeMember = await factory.createFreeMember({
            email: `free-${Date.now()}@example.com`,
            name: 'Free Member Demo'
        });
        createdData.members.push(freeMember.id);
        expect(freeMember).toBeDefined();
        expect(freeMember.email).toMatch(/^free-\d+@example\.com$/);
        expect(freeMember.name).toBe('Free Member Demo');
        expect(freeMember.status).toBe('free');

        // Create a paid member with specific subscription date
        const paidMember = await factory.createPaidMember({
            email: `paid-${Date.now()}@example.com`,
            name: 'Paid Member Demo',
            createdAt: new Date('2023-01-01'),
            startDate: new Date('2023-01-01'),
            cadence: 'month'
        });
        createdData.members.push(paidMember.id);
        expect(paidMember).toBeDefined();
        expect(paidMember.status).toBe('paid');
        expect(paidMember.created_at).toEqual(new Date('2023-01-01T06:00:00.000Z'));

        // Create a comped member
        const compedMember = await factory.createCompedMember({
            email: `comped-${Date.now()}@example.com`,
            name: 'Comped Member Demo'
        });
        createdData.members.push(compedMember.id);
        expect(compedMember).toBeDefined();
        expect(compedMember.status).toBe('comped');
    });

    test('demonstrates creating different types of posts', async () => {
        // Ensure we have an author
        let author = await db('users').where('visibility', 'public').first();
        if (!author) {
            const userId = factory.generateId();
            await db('users').insert({
                id: userId,
                name: 'Demo Author',
                slug: `demo-author-${Date.now()}`,
                email: `author-${Date.now()}@example.com`,
                password: '$2b$10$t5dY1uRRdjvqfNlXhae3iuQ4gkv0/c1QFvARGjVCEf2.sOCnulJ22',
                status: 'active',
                visibility: 'public',
                created_at: factory.dateToDatabase(new Date()),
                created_by: '1'
            });
            author = await db('users').where('id', userId).first();
            createdData.users.push(userId);
        }
        expect(author).toBeDefined();
        expect(author.id).toBeTruthy();

        // Create a published post
        const publishedPost = await factory.createPublishedPost({
            title: `Demo Published Post ${Date.now()}`,
            content: 'This is a published post for demonstration.',
            author: author.id,
            tags: ['Demo', 'Published']
        });
        createdData.posts.push(publishedPost.id);
        expect(publishedPost).toBeDefined();
        expect(publishedPost.status).toBe('published');
        expect(publishedPost.title).toMatch(/^Demo Published Post \d+$/);
        expect(publishedPost.published_at).toBeTruthy();

        // Create a draft post
        const draftPost = await factory.createDraftPost({
            title: `Demo Draft Post ${Date.now()}`,
            content: 'This is a draft post.',
            author: author.id
        });
        createdData.posts.push(draftPost.id);
        expect(draftPost).toBeDefined();
        expect(draftPost.status).toBe('draft');
        expect(draftPost.published_at).toBeNull();

        // Create a sent post (newsletter only)
        const sentPost = await factory.createSentPost({
            title: `Demo Newsletter ${Date.now()}`,
            content: 'This was sent as a newsletter.',
            author: author.id
        });
        createdData.posts.push(sentPost.id);
        expect(sentPost).toBeDefined();
        expect(sentPost.status).toBe('sent');

        // Create a published+sent post
        const publishedAndSentPost = await factory.createPublishedAndSentPost({
            title: `Demo Published & Sent ${Date.now()}`,
            content: 'This was published AND sent as newsletter.',
            author: author.id
        });
        createdData.posts.push(publishedAndSentPost.id);
        expect(publishedAndSentPost).toBeDefined();
        expect(publishedAndSentPost.status).toBe('published');
        expect(publishedAndSentPost.email_recipient_filter).toBe('all');

        // Verify associated email was created
        const email = await db('emails').where('post_id', publishedAndSentPost.id).first();
        expect(email).toBeDefined();
        expect(email.status).toBe('sent');
    });

    test('demonstrates using builder pattern for precise control', async () => {
        // Create a member with exact specifications
        const memberBuilder = factory.members()
            .withEmail(`builder-${Date.now()}@example.com`)
            .withName('Builder Pattern Demo')
            .withCreatedAt(new Date('2023-06-15'))
            .withLabels(['Premium', 'Early-Bird']);
            
        memberBuilder.asPaidMember({
            cadence: 'year',
            startDate: new Date('2023-06-15')
        });
        
        const customMember = await memberBuilder.create();
        createdData.members.push(customMember.id);
        expect(customMember).toBeDefined();
        expect(customMember.email).toMatch(/^builder-\d+@example\.com$/);
        expect(customMember.name).toBe('Builder Pattern Demo');
        expect(customMember.status).toBe('paid');
        expect(customMember.created_at).toEqual(new Date('2023-06-15T05:00:00.000Z'));
        
        // Verify labels were attached
        const labels = await db('members_labels')
            .join('labels', 'labels.id', 'members_labels.label_id')
            .where('members_labels.member_id', customMember.id)
            .select('labels.name', 'labels.id');
        expect(labels).toHaveLength(2);
        const labelNames = labels.map(l => l.name).sort();
        expect(labelNames).toEqual(['Early-Bird', 'Premium']);
        // Track label IDs for cleanup
        labels.forEach(label => createdData.labels.push(label.id));

        // Verify subscription exists for paid member
        const subscription = await db('members_stripe_customers_subscriptions')
            .join('members_stripe_customers', 'members_stripe_customers.customer_id', 'members_stripe_customers_subscriptions.customer_id')
            .where('members_stripe_customers.member_id', customMember.id)
            .first();
        expect(subscription).toBeDefined();
        expect(subscription.plan_interval).toBe('year');
        expect(subscription.status).toBe('active');

        // Create a post with specific visibility
        const post = await factory.posts()
            .withTitle(`Members-Only Content ${Date.now()}`)
            .withVisibility('members')
            .withContent('This content is only for members.')
            .asPublished()
            .create();
        createdData.posts.push(post.id);
        expect(post).toBeDefined();
        expect(post.visibility).toBe('members');
        expect(post.status).toBe('published');
    });
});