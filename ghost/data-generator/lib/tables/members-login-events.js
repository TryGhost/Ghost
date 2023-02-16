const TableImporter = require('./base');
const {faker} = require('@faker-js/faker');
const {luck} = require('../utils/random');
const generateEvents = require('../utils/event-generator');
const dateToDatabaseString = require('../utils/database-date');

class MembersLoginEventsImporter extends TableImporter {
    static table = 'members_login_events';

    constructor(knex) {
        super(MembersLoginEventsImporter.table, knex);
    }

    setImportOptions({model}) {
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
            total: shape === 'flat' ? Math.ceil(daysBetween / 3) : Math.ceil(daysBetween / 7),
            startTime: new Date(model.created_at),
            endTime: endDate
        });
    }

    generate() {
        const timestamp = this.timestamps.shift();
        if (!timestamp) {
            // Out of events for this user
            return null;
        }
        return {
            id: faker.database.mongodbObjectId(),
            created_at: dateToDatabaseString(timestamp),
            member_id: this.model.id
        };
    }
}

module.exports = MembersLoginEventsImporter;
