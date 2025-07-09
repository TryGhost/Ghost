const {test, expect} = require('@playwright/test');
const {createTestDataFactory} = require('../lib/ghost-data-factory');

test.describe('E2E Data Factory - Members', () => {
    let db;
    let factory;
    
    test.beforeAll(async () => {
        const setup = await createTestDataFactory();
        factory = setup.factory;
        db = factory.knex;
        
        // Clean up test data from previous runs
        await db('members').whereIn('email', [
            'e2e-free@example.com',
            'e2e-paid@example.com', 
            'e2e-comped@example.com',
            'e2e-vip@example.com',
            'e2e-monthly@example.com',
            'e2e-yearly@example.com'
        ]).delete();
    });
    
    test.afterAll(async () => {
        // Clean up all test data
        await db('members_labels').whereIn('member_id', function () {
            this.select('id').from('members').whereIn('email', [
                'e2e-free@example.com',
                'e2e-paid@example.com', 
                'e2e-comped@example.com',
                'e2e-vip@example.com',
                'e2e-monthly@example.com',
                'e2e-yearly@example.com'
            ]);
        }).delete();
        
        await db('members_stripe_customers').whereIn('member_id', function () {
            this.select('id').from('members').whereIn('email', [
                'e2e-free@example.com',
                'e2e-paid@example.com', 
                'e2e-comped@example.com',
                'e2e-vip@example.com',
                'e2e-monthly@example.com',
                'e2e-yearly@example.com'
            ]);
        }).delete();
        
        await db('members').whereIn('email', [
            'e2e-free@example.com',
            'e2e-paid@example.com', 
            'e2e-comped@example.com',
            'e2e-vip@example.com',
            'e2e-monthly@example.com',
            'e2e-yearly@example.com'
        ]).delete();
        
        // Clean up labels created in tests
        await db('labels').whereIn('name', ['VIP', 'Premium', 'Early Access']).delete();
        
        await factory.destroy();
    });

    test('should create different types of members', async () => {
        // Create a free member
        const freeMember = await factory.createFreeMember({
            email: 'e2e-free@example.com',
            name: 'Free Test Member'
        });
        
        expect(freeMember.email).toBe('e2e-free@example.com');
        expect(freeMember.status).toBe('free');
        expect(freeMember.name).toBe('Free Test Member');

        // Create a paid member with specific subscription date
        const paidMember = await factory.createPaidMember({
            email: 'e2e-paid@example.com',
            name: 'Paid Test Member',
            createdAt: new Date('2023-01-01'),
            startDate: new Date('2023-01-01'),
            cadence: 'month'
        });
        
        expect(paidMember.email).toBe('e2e-paid@example.com');
        expect(paidMember.status).toBe('paid');
        expect(paidMember.created_at).toEqual(new Date('2023-01-01T06:00:00.000Z'));
        
        // Verify subscription exists
        const subscription = await db('members_stripe_customers_subscriptions')
            .join('members_stripe_customers', 'members_stripe_customers.customer_id', 'members_stripe_customers_subscriptions.customer_id')
            .where('members_stripe_customers.member_id', paidMember.id)
            .first();
            
        expect(subscription).toBeTruthy();
        expect(subscription.status).toBe('active');
        expect(subscription.plan_interval).toBe('month');

        // Create a comped member
        const compedMember = await factory.createCompedMember({
            email: 'e2e-comped@example.com',
            name: 'Comped Test Member'
        });
        
        expect(compedMember.email).toBe('e2e-comped@example.com');
        expect(compedMember.status).toBe('comped');

        // Create a member with labels using builder pattern
        const vipMemberBuilder = factory.members()
            .withEmail('e2e-vip@example.com')
            .withName('VIP Test Member')
            .withStatus('paid')
            .withCreatedAt(new Date('2023-06-01'))
            .withLabels(['VIP', 'Premium', 'Early Access']);
            
        vipMemberBuilder.asPaidMember({
            cadence: 'year',
            startDate: new Date('2023-06-01')
        });
            
        const vipMember = await vipMemberBuilder.create();
            
        expect(vipMember.email).toBe('e2e-vip@example.com');
        expect(vipMember.status).toBe('paid');
        
        // Verify labels
        const labels = await db('members_labels')
            .join('labels', 'labels.id', 'members_labels.label_id')
            .where('members_labels.member_id', vipMember.id)
            .select('labels.name');
            
        const labelNames = labels.map(l => l.name);
        expect(labelNames).toContain('VIP');
        expect(labelNames).toContain('Premium');
        expect(labelNames).toContain('Early Access');
    });

    test('should create members with different subscription states', async () => {
        // Active monthly subscription
        const monthlyMember = await factory.createPaidMember({
            email: 'e2e-monthly@example.com',
            cadence: 'month',
            startDate: new Date('2024-01-01')
        });
        
        // Active yearly subscription
        const yearlyMember = await factory.createPaidMember({
            email: 'e2e-yearly@example.com',
            cadence: 'year',
            startDate: new Date('2024-01-01')
        });
        
        // Verify MRR calculations
        const monthlySubscription = await db('members_stripe_customers_subscriptions')
            .join('members_stripe_customers', 'members_stripe_customers.customer_id', 'members_stripe_customers_subscriptions.customer_id')
            .where('members_stripe_customers.member_id', monthlyMember.id)
            .first();
            
        const yearlySubscription = await db('members_stripe_customers_subscriptions')
            .join('members_stripe_customers', 'members_stripe_customers.customer_id', 'members_stripe_customers_subscriptions.customer_id')
            .where('members_stripe_customers.member_id', yearlyMember.id)
            .first();
            
        expect(monthlySubscription.mrr).toBe(500); // $5.00
        expect(yearlySubscription.mrr).toBe(416); // $50.00/12 rounded down
    });
});

test.describe('E2E Data Factory - Posts', () => {
    let db;
    let factory;
    let defaultAuthor;
    const createdPosts = [];
    const createdTags = new Set();
    let createdAuthorId = null;
    
    test.beforeAll(async () => {
        const setup = await createTestDataFactory();
        factory = setup.factory;
        db = factory.knex;
        
        // Create a default author for posts
        defaultAuthor = await db('users').where('slug', 'ghost').first();
        if (!defaultAuthor) {
            // Try to find existing test-author
            defaultAuthor = await db('users').where('slug', 'test-author').first();
            
            if (!defaultAuthor) {
                const userId = factory.generateId();
                await db('users').insert({
                    id: userId,
                    name: 'Test Author',
                    slug: 'test-author',
                    email: 'author@example.com',
                    password: '$2b$10$t5dY1uRRdjvqfNlXhae3iuQ4gkv0/c1QFvARGjVCEf2.sOCnulJ22',
                    status: 'active',
                    visibility: 'public',
                    created_at: factory.dateToDatabase(new Date()),
                    created_by: '1'
                });
                defaultAuthor = await db('users').where('id', userId).first();
                createdAuthorId = userId;
            }
        }
    });
    
    test.afterEach(async () => {
        // Clean up posts and related data
        if (createdPosts.length > 0) {
            await db('posts_tags').whereIn('post_id', createdPosts).delete();
            await db('posts_authors').whereIn('post_id', createdPosts).delete();
            await db('emails').whereIn('post_id', createdPosts).delete();
            await db('posts').whereIn('id', createdPosts).delete();
            createdPosts.length = 0;
        }
        
        if (createdTags.size > 0) {
            // First delete any remaining post-tag relationships for these tags
            const tagIds = await db('tags')
                .whereIn('name', Array.from(createdTags))
                .select('id');
            if (tagIds.length > 0) {
                await db('posts_tags').whereIn('tag_id', tagIds.map(t => t.id)).delete();
            }
            // Now we can safely delete the tags
            await db('tags').whereIn('name', Array.from(createdTags)).delete();
            createdTags.clear();
        }
    });
    
    test.afterAll(async () => {
        // Clean up created author if any
        if (createdAuthorId) {
            await db('users').where('id', createdAuthorId).delete();
        }
        
        await factory.destroy();
    });

    test('should create different types of posts', async () => {
        const timestamp = Date.now();
        // Create a published post
        const publishedPost = await factory.createPublishedPost({
            title: `E2E Published Post ${timestamp}`,
            content: 'This is a published post created by E2E tests.',
            publishedAt: new Date('2024-01-15'),
            author: defaultAuthor.id,
            tags: ['E2E', 'Testing', 'Published']
        });
        createdPosts.push(publishedPost.id);
        ['E2E', 'Testing', 'Published'].forEach(tag => createdTags.add(tag));
        
        expect(publishedPost.title).toBe(`E2E Published Post ${timestamp}`);
        expect(publishedPost.status).toBe('published');
        expect(publishedPost.published_at).toEqual(new Date('2024-01-15T06:00:00.000Z'));
        
        // Verify tags
        const publishedTags = await db('posts_tags')
            .join('tags', 'tags.id', 'posts_tags.tag_id')
            .where('posts_tags.post_id', publishedPost.id)
            .select('tags.name');
        
        const tagNames = publishedTags.map(t => t.name).sort();
        expect(tagNames).toEqual(['E2E', 'Published', 'Testing']);

        // Create a draft post
        const draftPost = await factory.createDraftPost({
            title: `E2E Draft Post ${timestamp}`,
            content: 'This is a draft post that is not yet published.',
            author: defaultAuthor.id,
            tags: ['Draft', 'WIP']
        });
        createdPosts.push(draftPost.id);
        ['Draft', 'WIP'].forEach(tag => createdTags.add(tag));
        
        expect(draftPost.title).toBe(`E2E Draft Post ${timestamp}`);
        expect(draftPost.status).toBe('draft');
        expect(draftPost.published_at).toBeNull();

        // Create a sent post (newsletter only)
        const sentPost = await factory.createSentPost({
            title: `E2E Newsletter - Sent Only ${timestamp}`,
            content: 'This newsletter was sent but not published on the site.',
            sentAt: new Date('2024-02-01'),
            author: defaultAuthor.id
        });
        createdPosts.push(sentPost.id);
        
        expect(sentPost.title).toBe(`E2E Newsletter - Sent Only ${timestamp}`);
        expect(sentPost.status).toBe('sent');
        
        // Verify email record was created
        const sentEmail = await db('emails')
            .where('post_id', sentPost.id)
            .first();
            
        expect(sentEmail).toBeTruthy();
        expect(sentEmail.status).toBe('sent');
        expect(sentEmail.subject).toBe(`E2E Newsletter - Sent Only ${timestamp}`);

        // Create a published post that was also sent as newsletter
        const publishedAndSentPost = await factory.createPublishedAndSentPost({
            title: `E2E Published & Sent Newsletter ${timestamp}`,
            content: 'This post was published on the site AND sent as a newsletter.',
            publishedAt: new Date('2024-02-15'),
            author: defaultAuthor.id,
            tags: ['Newsletter', 'Announcement']
        });
        createdPosts.push(publishedAndSentPost.id);
        ['Newsletter', 'Announcement'].forEach(tag => createdTags.add(tag));
        
        expect(publishedAndSentPost.title).toBe(`E2E Published & Sent Newsletter ${timestamp}`);
        expect(publishedAndSentPost.status).toBe('published');
        expect(publishedAndSentPost.email_recipient_filter).toBe('all');
        
        // Verify email record exists
        const publishedEmail = await db('emails')
            .where('post_id', publishedAndSentPost.id)
            .first();
            
        expect(publishedEmail).toBeTruthy();
        expect(publishedEmail.status).toBe('sent');
    });

    test('should create posts with different visibility settings', async () => {
        // Public post
        const publicPost = await factory.posts()
            .withTitle(`Public Post ${Date.now()}`)
            .withVisibility('public')
            .asPublished()
            .create();
        createdPosts.push(publicPost.id);
            
        expect(publicPost.visibility).toBe('public');

        // Members-only post
        const membersPost = await factory.posts()
            .withTitle(`Members Only Post ${Date.now()}`)
            .withVisibility('members')
            .asPublished()
            .create();
        createdPosts.push(membersPost.id);
            
        expect(membersPost.visibility).toBe('members');

        // Paid members only post
        const paidPost = await factory.posts()
            .withTitle(`Paid Members Only Post ${Date.now()}`)
            .withVisibility('paid')
            .asPublished()
            .create();
        createdPosts.push(paidPost.id);
            
        expect(paidPost.visibility).toBe('paid');
    });

    test('should create featured posts', async () => {
        const featuredPost = await factory.posts()
            .withTitle(`Featured Post ${Date.now()}`)
            .asFeatured()
            .asPublished()
            .withTags(['Featured', 'Important'])
            .create();
        createdPosts.push(featuredPost.id);
        ['Featured', 'Important'].forEach(tag => createdTags.add(tag));
            
        expect(featuredPost.featured).toBeTruthy(); // MySQL returns 1 for true
        expect(featuredPost.status).toBe('published');
    });

    test('should create scheduled posts', async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7); // 7 days from now
        
        const scheduledPost = await factory.posts()
            .withTitle(`Scheduled for Next Week ${Date.now()}`)
            .asScheduled(futureDate)
            .create();
        createdPosts.push(scheduledPost.id);
            
        expect(scheduledPost.status).toBe('scheduled');
        // Compare just the date part due to timezone differences
        const scheduledDate = new Date(scheduledPost.published_at);
        expect(scheduledDate.toDateString()).toBe(futureDate.toDateString());
    });
});

test.describe('E2E Data Factory - Complex Scenarios', () => {
    let db;
    let factory;
    const createdUsers = [];
    const createdPosts = [];
    const createdMembers = [];
    const createdTags = new Set();
    
    test.beforeAll(async () => {
        const setup = await createTestDataFactory();
        factory = setup.factory;
        db = factory.knex;
    });
    
    test.afterEach(async () => {
        // Clean up all test data
        if (createdPosts.length > 0) {
            await db('posts_tags').whereIn('post_id', createdPosts).delete();
            await db('posts_authors').whereIn('post_id', createdPosts).delete();
            await db('emails').whereIn('post_id', createdPosts).delete();
            await db('posts').whereIn('id', createdPosts).delete();
            createdPosts.length = 0;
        }
        
        if (createdMembers.length > 0) {
            await db('members_stripe_customers').whereIn('member_id', createdMembers).delete();
            await db('members').whereIn('id', createdMembers).delete();
            createdMembers.length = 0;
        }
        
        if (createdUsers.length > 0) {
            await db('users').whereIn('id', createdUsers).delete();
            createdUsers.length = 0;
        }
        
        if (createdTags.size > 0) {
            // First delete any remaining post-tag relationships for these tags
            const tagIds = await db('tags')
                .whereIn('name', Array.from(createdTags))
                .select('id');
            if (tagIds.length > 0) {
                await db('posts_tags').whereIn('tag_id', tagIds.map(t => t.id)).delete();
            }
            // Now we can safely delete the tags
            await db('tags').whereIn('name', Array.from(createdTags)).delete();
            createdTags.clear();
        }
    });
    
    test.afterAll(async () => {
        await factory.destroy();
    });

    test('should create a complete blog scenario', async () => {
        // Create authors
        const author1Id = factory.generateId();
        await db('users').insert({
            id: author1Id,
            name: 'Jane Doe',
            slug: `jane-doe-${Date.now()}`,
            email: `jane-${Date.now()}@example.com`,
            password: '$2b$10$t5dY1uRRdjvqfNlXhae3iuQ4gkv0/c1QFvARGjVCEf2.sOCnulJ22',
            status: 'active',
            visibility: 'public',
            created_at: factory.dateToDatabase(new Date()),
            created_by: '1'
        });
        const author1 = await db('users').where('id', author1Id).first();
        createdUsers.push(author1Id);
        
        const author2Id = factory.generateId();
        await db('users').insert({
            id: author2Id,
            name: 'John Smith',
            slug: `john-smith-${Date.now()}`,
            email: `john-${Date.now()}@example.com`,
            password: '$2b$10$t5dY1uRRdjvqfNlXhae3iuQ4gkv0/c1QFvARGjVCEf2.sOCnulJ22',
            status: 'active',
            visibility: 'public',
            created_at: factory.dateToDatabase(new Date()),
            created_by: '1'
        });
        const author2 = await db('users').where('id', author2Id).first();
        createdUsers.push(author2Id);

        // Create a mix of content
        const posts = [];
        
        // Published posts by different authors
        const post1 = await factory.createPublishedPost({
            title: `Welcome to Our Blog ${Date.now()}`,
            content: 'This is our first post!',
            author: author1.id,
            tags: ['Welcome', 'Introduction'],
            publishedAt: new Date('2024-01-01')
        });
        posts.push(post1);
        createdPosts.push(post1.id);
        ['Welcome', 'Introduction'].forEach(tag => createdTags.add(tag));
        
        const post2 = await factory.createPublishedPost({
            title: `Technical Deep Dive ${Date.now()}`,
            content: 'Let\'s explore some technical concepts...',
            author: author2.id,
            tags: ['Technical', 'Tutorial'],
            publishedAt: new Date('2024-01-05')
        });
        posts.push(post2);
        createdPosts.push(post2.id);
        ['Technical', 'Tutorial'].forEach(tag => createdTags.add(tag));

        // Draft posts
        const post3 = await factory.createDraftPost({
            title: `Upcoming Feature Announcement ${Date.now()}`,
            content: 'We\'re excited to announce...',
            author: author1.id,
            tags: ['Announcement', 'Draft']
        });
        posts.push(post3);
        createdPosts.push(post3.id);
        ['Announcement', 'Draft'].forEach(tag => createdTags.add(tag));

        // Newsletter that was sent
        const post4 = await factory.createPublishedAndSentPost({
            title: `Monthly Newsletter - January 2024 ${Date.now()}`,
            content: 'Here\'s what happened this month...',
            author: author1.id,
            tags: ['Newsletter', 'Monthly Update'],
            publishedAt: new Date('2024-01-31')
        });
        posts.push(post4);
        createdPosts.push(post4.id);
        ['Newsletter', 'Monthly Update'].forEach(tag => createdTags.add(tag));

        // Create different types of members
        const members = [];
        
        const timestamp = Date.now();
        const member1 = await factory.createFreeMember({
            email: `scenario-free-${timestamp}@example.com`,
            name: 'Free Reader'
        });
        members.push(member1);
        createdMembers.push(member1.id);
        
        const member2 = await factory.createPaidMember({
            email: `scenario-paid-${timestamp}@example.com`,
            name: 'Premium Subscriber',
            cadence: 'month'
        });
        members.push(member2);
        createdMembers.push(member2.id);
        
        const member3 = await factory.createCompedMember({
            email: `scenario-vip-${timestamp}@example.com`,
            name: 'VIP Guest'
        });
        members.push(member3);
        createdMembers.push(member3.id);

        // Verify the scenario
        expect(posts).toHaveLength(4);
        expect(members).toHaveLength(3);
        
        // Check post statuses
        const postStatuses = await db('posts')
            .whereIn('id', posts.map(p => p.id))
            .select('status')
            .then(rows => rows.map(r => r.status));
            
        expect(postStatuses).toContain('published');
        expect(postStatuses).toContain('draft');
        
        // Check member statuses
        const memberStatuses = await db('members')
            .whereIn('id', members.map(m => m.id))
            .select('status')
            .then(rows => rows.map(r => r.status));
            
        expect(memberStatuses).toContain('free');
        expect(memberStatuses).toContain('paid');
        expect(memberStatuses).toContain('comped');
    });
});