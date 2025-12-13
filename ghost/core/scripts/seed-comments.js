#!/usr/bin/env node
/**
 * Seed script for comment moderation testing
 *
 * Creates a post with various types of comments:
 * - Comments from members
 * - Comments from non-members (member deleted)
 * - Threaded comments (replies)
 * - Comments with different statuses (published, hidden, deleted)
 *
 * Usage (inside Docker):
 *   docker exec ghost-dev node /home/ghost/ghost/core/scripts/seed-comments.js [--extra-comments N]
 */

const path = require('path');

async function main() {
    const argv = process.argv.slice(2);
    const inlineArg = argv.find(arg => arg.startsWith('--extra-comments='));
    let extraComments = 0;

    if (inlineArg) {
        extraComments = parseInt(inlineArg.split('=')[1], 10) || 0;
    } else {
        const flagIndex = argv.indexOf('--extra-comments');
        if (flagIndex !== -1 && argv[flagIndex + 1]) {
            extraComments = parseInt(argv[flagIndex + 1], 10) || 0;
        }
    }

    extraComments = Math.max(0, extraComments);

    // Change to ghost/core directory for proper config loading
    process.chdir(path.join(__dirname, '..'));

    // Set up minimal config
    const config = require('../core/shared/config');

    // Initialize database connection
    const knex = require('knex')({
        client: 'mysql2',
        connection: {
            host: config.get('database:connection:host') || 'localhost',
            port: config.get('database:connection:port') || 3306,
            user: config.get('database:connection:user') || 'root',
            password: config.get('database:connection:password') || '',
            database: config.get('database:connection:database') || 'ghost'
        }
    });

    const ObjectId = require('bson-objectid');

    try {
        console.log('Creating test data for comment moderation...\n');
        if (extraComments) {
            console.log(`Adding ${extraComments} additional load-test comments`);
        }
        console.log(`Database: ${config.get('database:connection:database')}`);

        // 1. Get a published post to attach comments to
        console.log('\n1. Finding a published post...');
        let post = await knex('posts')
            .where('status', 'published')
            .whereNull('type')
            .orWhere('type', 'post')
            .first();

        if (!post) {
            console.error('No published posts found. Please create a post first.');
            process.exit(1);
        }
        console.log(`   Using post: "${post.title}" (${post.id})`);

        // 2. Create test members
        console.log('\n2. Finding or creating test members...');
        const memberData = [
            {name: 'Alice Member', email: 'alice-test@example.com', status: 'free'},
            {name: 'Bob Commenter', email: 'bob-test@example.com', status: 'free'},
            {name: 'Charlie Spammer', email: 'charlie-test@example.com', status: 'free'},
            {name: 'Diana Helpful', email: 'diana-test@example.com', status: 'free'}
        ];

        const members = [];
        const now = new Date();

        for (const data of memberData) {
            let member = await knex('members').where('email', data.email).first();
            if (!member) {
                const id = ObjectId().toHexString();
                await knex('members').insert({
                    id,
                    uuid: require('crypto').randomUUID(),
                    transient_id: require('crypto').randomUUID(),
                    name: data.name,
                    email: data.email,
                    status: data.status,
                    commenting_enabled: true,
                    created_at: now,
                    updated_at: now
                });
                member = await knex('members').where('id', id).first();
                console.log(`   Created member: ${data.name} (${member.id})`);
            } else {
                console.log(`   Found existing member: ${data.name} (${member.id})`);
            }
            members.push(member);
        }

        const [alice, bob, charlie, diana] = members;

        // 3. Clear existing test comments (optional - for re-running)
        console.log('\n3. Clearing any existing test comments...');
        const testMemberIds = members.map(m => m.id);
        const deleted = await knex('comments')
            .whereIn('member_id', testMemberIds)
            .orWhereNull('member_id')
            .del();
        console.log(`   Deleted ${deleted} existing test comments`);

        // 4. Create top-level comments
        console.log('\n4. Creating top-level comments...');

        const topLevelComments = [
            {
                id: ObjectId().toHexString(),
                post_id: post.id,
                member_id: alice.id,
                html: '<p>Great post! I really enjoyed reading this. The insights are valuable.</p>',
                status: 'published',
                hidden_at_ban: false,
                created_at: new Date(now - 7 * 24 * 60 * 60 * 1000),
                updated_at: new Date(now - 7 * 24 * 60 * 60 * 1000)
            },
            {
                id: ObjectId().toHexString(),
                post_id: post.id,
                member_id: bob.id,
                html: '<p>I have a question about this topic. Can you explain more about the second point?</p>',
                status: 'published',
                hidden_at_ban: false,
                created_at: new Date(now - 6 * 24 * 60 * 60 * 1000),
                updated_at: new Date(now - 6 * 24 * 60 * 60 * 1000)
            },
            {
                id: ObjectId().toHexString(),
                post_id: post.id,
                member_id: charlie.id,
                html: '<p>BUY NOW! Amazing deals at spam-site.com! Click here for FREE stuff!</p>',
                status: 'hidden',
                hidden_at_ban: false,
                created_at: new Date(now - 5 * 24 * 60 * 60 * 1000),
                updated_at: new Date(now - 5 * 24 * 60 * 60 * 1000)
            },
            {
                id: ObjectId().toHexString(),
                post_id: post.id,
                member_id: diana.id,
                html: '<p>This is exactly what I needed to read today. Thank you for sharing!</p>',
                status: 'published',
                hidden_at_ban: false,
                created_at: new Date(now - 4 * 24 * 60 * 60 * 1000),
                updated_at: new Date(now - 4 * 24 * 60 * 60 * 1000)
            },
            {
                id: ObjectId().toHexString(),
                post_id: post.id,
                member_id: bob.id,
                html: '<p>This comment was deleted by the user.</p>',
                status: 'deleted',
                hidden_at_ban: false,
                created_at: new Date(now - 3 * 24 * 60 * 60 * 1000),
                updated_at: new Date(now - 3 * 24 * 60 * 60 * 1000)
            },
            {
                id: ObjectId().toHexString(),
                post_id: post.id,
                member_id: null, // Comment from deleted member
                html: '<p>This comment is from a member who was deleted from the system.</p>',
                status: 'published',
                hidden_at_ban: false,
                created_at: new Date(now - 2 * 24 * 60 * 60 * 1000),
                updated_at: new Date(now - 2 * 24 * 60 * 60 * 1000)
            },
            {
                id: ObjectId().toHexString(),
                post_id: post.id,
                member_id: alice.id,
                html: '<p>Just revisiting this post. Still relevant!</p>',
                status: 'published',
                hidden_at_ban: false,
                created_at: new Date(now - 1 * 60 * 60 * 1000),
                updated_at: new Date(now - 1 * 60 * 60 * 1000)
            },
            // More spam from Charlie that was hidden due to ban
            {
                id: ObjectId().toHexString(),
                post_id: post.id,
                member_id: charlie.id,
                html: '<p>Visit my website for the best deals! www.totally-not-spam.com</p>',
                status: 'hidden',
                hidden_at_ban: true, // This one was hidden when Charlie was banned
                created_at: new Date(now - 4.5 * 24 * 60 * 60 * 1000),
                updated_at: new Date(now - 4.5 * 24 * 60 * 60 * 1000)
            }
        ];

        // Insert top-level comments
        for (const comment of topLevelComments) {
            await knex('comments').insert(comment);
            const statusLabel = comment.hidden_at_ban ? 'hidden (ban)' : comment.status;
            console.log(`   Created: "${comment.html.substring(3, 50)}..." [${statusLabel}]`);
        }

        if (extraComments > 0) {
            console.log(`\n4b. Creating ${extraComments} additional comments for load testing...`);
            for (let i = 0; i < extraComments; i++) {
                const author = members[i % members.length];
                const createdAt = new Date(now - i * 30 * 60 * 1000);
                const extraComment = {
                    id: ObjectId().toHexString(),
                    post_id: post.id,
                    member_id: author.id,
                    html: `<p>Load test comment #${i + 1} from ${author.name}.</p>`,
                    status: 'published',
                    hidden_at_ban: false,
                    created_at: createdAt,
                    updated_at: createdAt
                };
                await knex('comments').insert(extraComment);
            }
            console.log('   Additional comments created');
        }

        // Store references for threading
        const aliceComment = topLevelComments[0];
        const bobQuestion = topLevelComments[1];
        const dianaComment = topLevelComments[3];

        // 5. Create threaded replies
        console.log('\n5. Creating threaded replies...');

        const replies = [
            {
                id: ObjectId().toHexString(),
                post_id: post.id,
                member_id: bob.id,
                parent_id: aliceComment.id,
                in_reply_to_id: aliceComment.id,
                html: '<p>I agree with Alice! This is really well written.</p>',
                status: 'published',
                hidden_at_ban: false,
                created_at: new Date(now - 6.5 * 24 * 60 * 60 * 1000),
                updated_at: new Date(now - 6.5 * 24 * 60 * 60 * 1000)
            },
            {
                id: ObjectId().toHexString(),
                post_id: post.id,
                member_id: diana.id,
                parent_id: aliceComment.id,
                in_reply_to_id: aliceComment.id,
                html: '<p>Thanks for your comment Alice, it helped clarify things for me too.</p>',
                status: 'published',
                hidden_at_ban: false,
                created_at: new Date(now - 6 * 24 * 60 * 60 * 1000),
                updated_at: new Date(now - 6 * 24 * 60 * 60 * 1000)
            },
            {
                id: ObjectId().toHexString(),
                post_id: post.id,
                member_id: alice.id,
                parent_id: bobQuestion.id,
                in_reply_to_id: bobQuestion.id,
                html: '<p>Good question Bob! The second point refers to the implementation details.</p>',
                status: 'published',
                hidden_at_ban: false,
                created_at: new Date(now - 5.5 * 24 * 60 * 60 * 1000),
                updated_at: new Date(now - 5.5 * 24 * 60 * 60 * 1000)
            },
            {
                id: ObjectId().toHexString(),
                post_id: post.id,
                member_id: charlie.id,
                parent_id: dianaComment.id,
                in_reply_to_id: dianaComment.id,
                html: '<p>Check out my website for more great content like this!</p>',
                status: 'hidden',
                hidden_at_ban: true, // Hidden when Charlie was banned
                created_at: new Date(now - 3.5 * 24 * 60 * 60 * 1000),
                updated_at: new Date(now - 3.5 * 24 * 60 * 60 * 1000)
            },
            {
                id: ObjectId().toHexString(),
                post_id: post.id,
                member_id: bob.id,
                parent_id: bobQuestion.id,
                in_reply_to_id: null, // Reply in same thread but not to specific comment
                html: '<p>Thanks for the explanation! That makes sense now.</p>',
                status: 'published',
                hidden_at_ban: false,
                created_at: new Date(now - 5 * 24 * 60 * 60 * 1000),
                updated_at: new Date(now - 5 * 24 * 60 * 60 * 1000)
            },
            // A deleted reply
            {
                id: ObjectId().toHexString(),
                post_id: post.id,
                member_id: diana.id,
                parent_id: bobQuestion.id,
                in_reply_to_id: bobQuestion.id,
                html: '<p>I was going to say something but changed my mind.</p>',
                status: 'deleted',
                hidden_at_ban: false,
                created_at: new Date(now - 4.8 * 24 * 60 * 60 * 1000),
                updated_at: new Date(now - 4.8 * 24 * 60 * 60 * 1000)
            }
        ];

        for (const reply of replies) {
            await knex('comments').insert(reply);
            const statusLabel = reply.hidden_at_ban ? 'hidden (ban)' : reply.status;
            console.log(`   Created reply: "${reply.html.substring(3, 45)}..." [${statusLabel}]`);
        }

        // 6. Reset commenting_enabled for all test members, then ban only Charlie
        console.log('\n6. Resetting member ban states...');

        // First, enable commenting for all test members
        await knex('members')
            .whereIn('id', [alice.id, bob.id, charlie.id, diana.id])
            .update({commenting_enabled: true});
        console.log('   Reset all test members to commenting_enabled=true');

        // Reset hidden_at_ban flags - only Charlie's comments should have this set
        await knex('comments')
            .whereIn('member_id', [alice.id, bob.id, diana.id])
            .update({hidden_at_ban: false});

        // Set Charlie's hidden comments to have hidden_at_ban=true (simulating ban)
        await knex('comments')
            .where('member_id', charlie.id)
            .where('status', 'hidden')
            .update({hidden_at_ban: true});
        console.log('   Reset hidden_at_ban flags on comments');

        // Then ban only Charlie
        await knex('members')
            .where('id', charlie.id)
            .update({commenting_enabled: false});
        console.log(`   Banned Charlie (${charlie.id}) from commenting`);

        // Count totals
        const totalComments = await knex('comments').where('post_id', post.id).count('* as count').first();
        const publishedCount = await knex('comments').where('post_id', post.id).where('status', 'published').count('* as count').first();
        const hiddenCount = await knex('comments').where('post_id', post.id).where('status', 'hidden').count('* as count').first();
        const deletedCount = await knex('comments').where('post_id', post.id).where('status', 'deleted').count('* as count').first();

        // Summary
        console.log('\n========================================');
        console.log('SEED DATA CREATED SUCCESSFULLY');
        console.log('========================================');
        console.log(`
Post: "${post.title}"
Post ID: ${post.id}

Members:
  - Alice Member (alice-test@example.com) - active commenter
  - Bob Commenter (bob-test@example.com) - active commenter
  - Charlie Spammer (charlie-test@example.com) - BANNED
  - Diana Helpful (diana-test@example.com) - active commenter

Comments Summary:
  - Total: ${totalComments.count}
  - Published: ${publishedCount.count}
  - Hidden: ${hiddenCount.count}
  - Deleted: ${deletedCount.count}

To test comment moderation:
  1. Enable commentModeration in Labs (Settings → Labs)
  2. Navigate to /ghost/comments in the admin
  3. Try filtering by status, hiding/showing comments, bulk operations
`);

        await knex.destroy();
        process.exit(0);

    } catch (error) {
        console.error('Error seeding comments:', error);
        await knex.destroy();
        process.exit(1);
    }
}

main();
