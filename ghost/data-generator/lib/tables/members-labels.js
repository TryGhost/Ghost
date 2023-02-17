const TableImporter = require('./base');
const {faker} = require('@faker-js/faker');
const {luck} = require('../utils/random');

class MembersLabelsImporter extends TableImporter {
    static table = 'members_labels';

    constructor(knex, {labels}) {
        super(MembersLabelsImporter.table, knex);
        this.labels = labels;
    }

    setImportOptions({model}) {
        this.model = model;
    }

    generate() {
        if (luck(90)) {
            // 90% of members don't have labels
            return;
        }
        return {
            id: faker.database.mongodbObjectId(),
            member_id: this.model.id,
            label_id: this.labels[faker.datatype.number({
                min: 0,
                max: this.labels.length - 1
            })].id,
            sort_order: 0
        };
    }
}

module.exports = MembersLabelsImporter;
