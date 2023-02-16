const TableImporter = require('./base');
const {faker} = require('@faker-js/faker');
const {luck} = require('../utils/random');

class MembersCreatedEventsImporter extends TableImporter {
    static table = 'members_created_events';

    constructor(knex) {
        super(MembersCreatedEventsImporter.table, knex);
    }

    setImportOptions({model}) {
        this.model = model;
    }

    generateSource() {
        let source = 'member';
        if (luck(10)) {
            source = 'admin';
        } else if (luck(5)) {
            source = 'api';
        } else if (luck(5)) { // eslint-disable-line no-dupe-else-if
            source = 'import';
        }
        return source;
    }

    generate() {
        // TODO: Add attribution
        return {
            id: faker.database.mongodbObjectId(),
            created_at: this.model.created_at,
            member_id: this.model.id,
            source: this.generateSource()
        };
    }
}

module.exports = MembersCreatedEventsImporter;
