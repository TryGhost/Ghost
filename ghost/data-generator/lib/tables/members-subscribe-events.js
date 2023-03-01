const TableImporter = require('./base');
const {faker} = require('@faker-js/faker');
const {luck} = require('../utils/random');
const dateToDatabaseString = require('../utils/database-date');

class MembersSubscribeEventsImporter extends TableImporter {
    static table = 'members_subscribe_events';
    constructor(knex, {newsletters, subscriptions}) {
        super(MembersSubscribeEventsImporter.table, knex);
        this.newsletters = newsletters;
        this.subscriptions = subscriptions;
    }

    setImportOptions({model}) {
        this.model = model;
        this.count = 0;
    }

    generate() {
        const count = this.count;
        this.count = this.count + 1;

        if (count === 1 && this.model.status === 'free') {
            return null;
        }

        let createdAt = dateToDatabaseString(faker.date.between(new Date(this.model.created_at), new Date()));
        let subscribed = luck(80);

        // Free newsletter by default
        let newsletterId = this.newsletters[1].id;
        if (this.model.status === 'paid' && count === 0) {
            // Paid newsletter
            newsletterId = this.newsletters[0].id;
            createdAt = this.subscriptions.find(s => s.member_id === this.model.id).created_at;
            subscribed = luck(98);
        }

        if (!subscribed) {
            return null;
        }

        return {
            id: faker.database.mongodbObjectId(),
            member_id: this.model.id,
            newsletter_id: newsletterId,
            subscribed: true,
            created_at: createdAt,
            source: 'member'
        };
    }
}

module.exports = MembersSubscribeEventsImporter;
