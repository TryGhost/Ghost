const TableImporter = require('./TableImporter');
const {faker} = require('@faker-js/faker');
const dateToDatabaseString = require('../utils/database-date');

class MembersStatusEventsImporter extends TableImporter {
    static table = 'members_status_events';
    static dependencies = ['members'];

    constructor(knex, transaction) {
        super(MembersStatusEventsImporter.table, knex, transaction);
    }

    async import(quantity) {
        const members = await this.transaction.select('id', 'created_at', 'status').from('members');

        await this.importForEach(members, quantity ? quantity / members.length : 2);
    }

    setReferencedModel(model) {
        this.events = [{
            id: this.fastFakeObjectId(),
            member_id: model.id,
            from_status: null,
            to_status: 'free',
            created_at: dateToDatabaseString(model.created_at)
        }];
        if (model.status !== 'free') {
            this.events.push({
                id: this.fastFakeObjectId(),
                member_id: model.id,
                from_status: 'free',
                to_status: model.status,
                created_at: dateToDatabaseString(faker.date.between(new Date(model.created_at), new Date()))
            });
        }
    }

    generate() {
        const event = this.events.pop();
        if (!event) {
            return null;
        }
        return event;
    }
}

module.exports = MembersStatusEventsImporter;
