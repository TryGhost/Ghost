const {faker} = require('@faker-js/faker');
const TableImporter = require('./base');
const {luck} = require('../utils/random');

class MembersNewslettersImporter extends TableImporter {
    constructor(knex, {newsletters}) {
        super('members_newsletters', knex);
        this.newsletters = newsletters;
    }

    // eslint-disable-next-line no-unused-vars
    setImportOptions({amount: _amount, model}) {
        this.model = model;
    }

    generate() {
        let newsletterId;
        if (this.model.status === 'free') {
            if (luck(90)) {
                newsletterId = this.newsletters[0].id;
            } else {
                return null;
            }
        } else {
            if (luck(95)) {
                newsletterId = this.newsletters[1].id;
            } else {
                return null;
            }
        }
        return {
            id: faker.database.mongodbObjectId(),
            member_id: this.model.id,
            newsletter_id: newsletterId
        };
    }
}

module.exports = MembersNewslettersImporter;
