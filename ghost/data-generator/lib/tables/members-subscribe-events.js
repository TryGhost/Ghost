const TableImporter = require('./base');
const {faker} = require('@faker-js/faker');

class MembersSubscribeEventsImporter extends TableImporter {
    constructor(knex) {
        super('members_subscribe_events', knex);
    }

    setImportOptions({model}) {
        this.model = model;
    }

    generate() {
        return {
            id: faker.database.mongodbObjectId(),
            member_id: this.model.member_id,
            newsletter_id: this.model.newsletter_id,
            subscribed: true,
            created_at: faker.date.between(this.model.created_at, new Date()),
            source: 'member'
        };
    }
}

module.exports = MembersSubscribeEventsImporter;
