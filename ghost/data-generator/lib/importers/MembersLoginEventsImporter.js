const TableImporter = require('./TableImporter');
const {luck} = require('../utils/random');
const generateEvents = require('../utils/event-generator');
const dateToDatabaseString = require('../utils/database-date');

class MembersLoginEventsImporter extends TableImporter {
    static table = 'members_login_events';
    static dependencies = ['members'];

    constructor(knex, transaction) {
        super(MembersLoginEventsImporter.table, knex, transaction);
    }

    async import(quantity) {
        if (quantity === 0) {
            return;
        }

        let offset = 0;
        let limit = 100000;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const members = await this.transaction.select('id', 'created_at').from('members').limit(limit).offset(offset);

            if (members.length === 0) {
                break;
            }

            await this.importForEach(members, quantity ? quantity / members.length : 5);

            offset += limit;
        }
    }

    setReferencedModel(model) {
        this.model = model;

        const endDate = new Date();
        const daysBetween = Math.ceil((endDate.valueOf() - new Date(model.created_at).valueOf()) / (1000 * 60 * 60 * 24));

        // Assuming most people either subscribe and lose interest, or maintain steady readership
        const shape = luck(40) ? 'ease-out' : 'flat';
        this.timestamps = generateEvents({
            shape,
            trend: 'negative',
            // Steady readers login more, readers who lose interest read less overall.
            // ceil because members will all have logged in at least once
            total: Math.min(5, shape === 'flat' ? Math.ceil(daysBetween / 3) : Math.ceil(daysBetween / 7)),
            startTime: new Date(model.created_at),
            endTime: endDate
        });
    }

    generate() {
        const timestamp = this.timestamps.pop();
        if (!timestamp) {
            // Out of events for this user
            return null;
        }
        return {
            id: this.fastFakeObjectId(),
            created_at: dateToDatabaseString(timestamp),
            member_id: this.model.id
        };
    }
}

module.exports = MembersLoginEventsImporter;
