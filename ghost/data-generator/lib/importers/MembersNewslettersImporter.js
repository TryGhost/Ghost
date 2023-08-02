const {faker} = require('@faker-js/faker');
const TableImporter = require('./TableImporter');

class MembersNewslettersImporter extends TableImporter {
    static table = 'members_newsletters';
    static dependencies = ['members_subscribe_events'];

    constructor(knex, transaction) {
        super(MembersNewslettersImporter.table, knex, transaction);
    }

    async import(quantity) {
        const membersSubscribeEvents = await this.transaction.select('member_id', 'newsletter_id').from('members_subscribe_events');

        await this.importForEach(membersSubscribeEvents, quantity ? quantity / membersSubscribeEvents.length : 1);
    }

    generate() {
        return {
            id: faker.database.mongodbObjectId(),
            member_id: this.model.member_id,
            newsletter_id: this.model.newsletter_id
        };
    }
}

module.exports = MembersNewslettersImporter;
