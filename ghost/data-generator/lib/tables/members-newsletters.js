const {faker} = require('@faker-js/faker');
const TableImporter = require('./base');

class MembersNewslettersImporter extends TableImporter {
    constructor(knex) {
        super('members_newsletters', knex);
    }

    setImportOptions({model}) {
        this.model = model;
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
