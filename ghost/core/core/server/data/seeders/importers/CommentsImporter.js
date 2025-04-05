const {faker} = require('@faker-js/faker');
const TableImporter = require('./TableImporter');
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

        this.commentIds = [];

        this.timestamps = generateEvents({
            shape: 'ease-out',
            trend: 'negative',
            // Steady readers login more, readers who lose interest read less overall.
            // ceil because members will all have logged in at least once
            total: faker.datatype.number({min: 0, max: this.commentsPerPost}),
            startTime: new Date(model.published_at),
            endTime: new Date()
        });

        this.possibleMembers = this.members.filter(member => new Date(member.created_at) < new Date(model.published_at));
    }

    generate() {
        const timestamp = this.timestamps.pop();
        if (!timestamp) {
            // Out of events for this post
            return null;
        }

        if (this.possibleMembers.length === 0) {
            return null;
        }

        const isReply = luck(30) && this.commentIds.length > 0; // 30% of comments are replies

        const event = {
            id: this.fastFakeObjectId(),
            post_id: this.model.id,
            member_id: this.possibleMembers[faker.datatype.number(this.possibleMembers.length - 1)].id,
            parent_id: isReply ? this.commentIds[faker.datatype.number(this.commentIds.length - 1)] : undefined,
            status: 'published',
            created_at: dateToDatabaseString(timestamp),
            updated_at: dateToDatabaseString(timestamp),
            html: `<p>${faker.lorem.sentence().replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)}</p>`
        };

        this.commentIds.push(event.id);

        return event;
    }
}

module.exports = CommentsImporter;
