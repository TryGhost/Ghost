const TableImporter = require('./TableImporter');
const {faker} = require('@faker-js/faker');
const generateEvents = require('../utils/event-generator');
const {luck} = require('../utils/random');
const dateToDatabaseString = require('../utils/database-date');

class EmailsImporter extends TableImporter {
    static table = 'emails';
    static dependencies = ['posts', 'newsletters', 'members_subscribe_events'];

    constructor(knex, transaction) {
        super(EmailsImporter.table, knex, transaction);
    }

    async import(quantity) {
        if (quantity === 0) {
            return;
        }

        const posts = await this.transaction.select('id', 'title', 'published_at').from('posts').where('type', 'post').where('status', 'published').orderBy('published_at', 'desc');
        this.newsletters = await this.transaction.select('id').from('newsletters').orderBy('sort_order');
        this.membersSubscribeEvents = await this.transaction.select('id', 'newsletter_id', 'created_at').from('members_subscribe_events');

        // Only generate emails for last 25% of posts, and only generate emails for 50% of those
        await this.importForEach(posts.slice(0, Math.ceil(posts.length / 4)), quantity ? quantity / posts.length : 0.5);
    }

    generate() {
        const id = this.fastFakeObjectId();

        let newsletter;
        if (this.newsletters.length === 0) {
            return null;
        } else if (this.newsletters.length === 1) {
            newsletter = this.newsletters[0];
        } else {
            // Choose between first two newsletters
            newsletter = luck(90)
                // Regular premium
                ? this.newsletters[0]
                // Occasional freebie
                : this.newsletters[1];
        }

        const timestamp = luck(60)
            ? new Date(this.model.published_at)
            : generateEvents({
                shape: 'ease-out',
                trend: 'negative',
                total: 1,
                startTime: new Date(this.model.published_at),
                endTime: new Date()
            })[0];

        const recipientCount = this.membersSubscribeEvents
            .filter(entry => entry.newsletter_id === newsletter.id)
            .filter(entry => new Date(entry.created_at) < timestamp).length;
        const deliveredCount = Math.ceil(recipientCount * faker.datatype.float({
            max: 1,
            min: 0.9,
            precision: 0.001
        }));
        const openedCount = Math.ceil(deliveredCount * faker.datatype.float({
            max: 0.95,
            min: 0.6,
            precision: 0.001
        }));
        const failedCount = Math.floor((recipientCount - deliveredCount) * faker.datatype.float({
            max: 0.05,
            min: 0,
            precision: 0.001
        }));

        return {
            id,
            uuid: faker.datatype.uuid(),
            post_id: this.model.id,
            status: 'submitted',
            recipient_filter: '', // TODO: Add recipient filter?
            email_count: recipientCount,
            delivered_count: deliveredCount,
            opened_count: openedCount,
            failed_count: failedCount,
            subject: this.model.title,
            source_type: 'html',
            track_opens: true,
            track_clicks: true,
            feedback_enabled: true,
            submitted_at: dateToDatabaseString(timestamp),
            newsletter_id: newsletter.id,
            created_at: dateToDatabaseString(timestamp),
            created_by: 'unused',
            updated_at: dateToDatabaseString(timestamp),
            updated_by: 'unused'
        };
    }
}

module.exports = EmailsImporter;
