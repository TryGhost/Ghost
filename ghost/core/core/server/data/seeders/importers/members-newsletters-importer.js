const TableImporter = require('./table-importer');

class MembersNewslettersImporter extends TableImporter {
    static table = 'members_newsletters';
    static dependencies = ['members_subscribe_events'];

    constructor(knex, transaction) {
        super(MembersNewslettersImporter.table, knex, transaction);
    }

    async import(quantity) {
        let offset = 0;
        let limit = 100000;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const membersSubscribeEvents = await this.transaction.select('member_id', 'newsletter_id').from('members_subscribe_events').limit(limit).offset(offset);

            if (membersSubscribeEvents.length === 0) {
                break;
            }

            await this.importForEach(membersSubscribeEvents, quantity ? quantity / membersSubscribeEvents.length : 1);

            offset += limit;
        }
    }

    generate() {
        return {
            id: this.fastFakeObjectId(),
            member_id: this.model.member_id,
            newsletter_id: this.model.newsletter_id
        };
    }
}

module.exports = MembersNewslettersImporter;
