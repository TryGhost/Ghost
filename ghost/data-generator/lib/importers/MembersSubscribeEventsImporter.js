const TableImporter = require('./TableImporter');
const {faker} = require('@faker-js/faker');
const {luck} = require('../utils/random');
const dateToDatabaseString = require('../utils/database-date');

class MembersSubscribeEventsImporter extends TableImporter {
    static table = 'members_subscribe_events';
    static dependencies = ['members', 'newsletters'];

    constructor(knex, transaction) {
        super(MembersSubscribeEventsImporter.table, knex, transaction);
    }

    async import(quantity) {
        if (quantity === 0) {
            return;
        }

        let offset = 0;
        let limit = 100000;
        this.newsletters = await this.transaction.select('id').from('newsletters').orderBy('sort_order');

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const members = await this.transaction.select('id', 'created_at', 'status').from('members').limit(limit).offset(offset);

            if (members.length === 0) {
                break;
            }

            await this.importForEach(members, quantity ? quantity / members.length : this.newsletters.length);
            offset += limit;
        }
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

        let subscribed = luck(80);

        if (!subscribed) {
            return null;
        }

        const createdAt = dateToDatabaseString(faker.date.between(new Date(this.model.created_at), new Date()));
        const newsletterId = this.newsletters[count % this.newsletters.length].id;

        return {
            id: this.fastFakeObjectId(),
            member_id: this.model.id,
            newsletter_id: newsletterId,
            subscribed: 1,
            created_at: createdAt,
            source: 'member'
        };
    }
}

module.exports = MembersSubscribeEventsImporter;
