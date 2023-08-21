const TableImporter = require('./TableImporter');
const {faker} = require('@faker-js/faker');
const {luck} = require('../utils/random');
const dateToDatabaseString = require('../utils/database-date');

class MembersSubscribeEventsImporter extends TableImporter {
    static table = 'members_subscribe_events';
    static dependencies = ['members', 'newsletters', 'subscriptions'];

    constructor(knex, transaction) {
        super(MembersSubscribeEventsImporter.table, knex, transaction);
    }

    async import(quantity) {
        const members = await this.transaction.select('id', 'created_at', 'status').from('members');
        this.newsletters = await this.transaction.select('id').from('newsletters').orderBy('sort_order');
        this.subscriptions = await this.transaction.select('member_id', 'created_at').from('subscriptions');

        await this.importForEach(members, quantity ? quantity / members.length : 2);
    }

    setReferencedModel(model) {
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
