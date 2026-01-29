const {faker} = require('@faker-js/faker');
const TableImporter = require('./table-importer');
const {luck} = require('../utils/random');
const generateEvents = require('../utils/event-generator');
const dateToDatabaseString = require('../utils/database-date');

class CommentsImporter extends TableImporter {
    static table = 'comments';
    static dependencies = ['posts'];

    constructor(knex, transaction) {
        super(CommentsImporter.table, knex, transaction);
    }

    async import(quantity) {
        const posts = await this.transaction.select('id', 'published_at').from('posts')
            .where('status', 'published');
        this.members = await this.transaction.select('id', 'created_at').from('members');

        this.commentsPerPost = quantity ? quantity / posts.length : 10;

        await this.importForEach(posts, this.commentsPerPost);
    }

    setReferencedModel(model) {
        this.model = model;

        this.commentIds = []; // Store [id, parent_id, timestamp] tuples for reply-to-reply

        this.timestamps = generateEvents({
            shape: 'ease-out',
            trend: 'negative',
            // Use commentsPerPost as a baseline with some variance (+/- 20%)
            total: Math.round(this.commentsPerPost * faker.datatype.float({min: 0.8, max: 1.2})),
            startTime: new Date(model.published_at),
            endTime: new Date()
        }).sort((a, b) => a.getTime() - b.getTime()); // Sort chronologically so replies always come after their targets

        this.possibleMembers = this.members.filter(member => new Date(member.created_at) < new Date(model.published_at));
    }

    generate() {
        const timestamp = this.timestamps.shift();
        if (!timestamp) {
            // Out of events for this post
            return null;
        }

        if (this.possibleMembers.length === 0) {
            return null;
        }

        const isReply = luck(55) && this.commentIds.length > 0; // 55% of comments are replies

        let parentId = null;
        let inReplyToId = null;

        if (isReply) {
            // Filter to only include comments created before the current timestamp
            const eligibleComments = this.commentIds.filter(([, , ts]) => ts < timestamp);
            if (eligibleComments.length > 0) {
                // Bias toward picking existing replies to increase reply-to-reply frequency
                // 60% chance to prefer replying to a reply (if any exist)
                const existingReplies = eligibleComments.filter(([, pId]) => pId !== null);
                const preferReplyToReply = luck(60) && existingReplies.length > 0;

                let replyTarget;
                if (preferReplyToReply) {
                    // Pick from existing replies to create a reply-to-reply
                    const replyToIndex = faker.datatype.number(existingReplies.length - 1);
                    replyTarget = existingReplies[replyToIndex];
                } else {
                    // Pick any random eligible comment
                    const replyToIndex = faker.datatype.number(eligibleComments.length - 1);
                    replyTarget = eligibleComments[replyToIndex];
                }
                const [replyToId, replyToParentId] = replyTarget;

                if (replyToParentId === null) {
                    // Replying to a top-level comment - this becomes a direct reply
                    parentId = replyToId;
                } else {
                    // Replying to a reply
                    // parent_id stays the thread root, in_reply_to_id points to the specific reply
                    parentId = replyToParentId;
                    inReplyToId = replyToId;
                }
            }
            // If no eligible comments, parentId/inReplyToId stay null (top-level comment)
        }

        const event = {
            id: this.fastFakeObjectId(),
            post_id: this.model.id,
            member_id: this.possibleMembers[faker.datatype.number(this.possibleMembers.length - 1)].id,
            parent_id: parentId,
            in_reply_to_id: inReplyToId,
            status: 'published',
            created_at: dateToDatabaseString(timestamp),
            updated_at: dateToDatabaseString(timestamp),
            html: `<p>${faker.lorem.sentence().replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)}</p>`
        };

        this.commentIds.push([event.id, parentId, timestamp]);

        return event;
    }
}

module.exports = CommentsImporter;
