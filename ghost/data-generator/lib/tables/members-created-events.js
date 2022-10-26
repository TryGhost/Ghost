const TableImporter = require('./base');
const {faker} = require('@faker-js/faker');
const {luck} = require('../utils/random');

class MembersCreatedEventsImporter extends TableImporter {
    constructor(knex) {
        super('members_created_events', knex);
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
