const TableImporter = require('./table-importer');
const {faker} = require('@faker-js/faker');
const {luck} = require('../utils/random');

class MembersLabelsImporter extends TableImporter {
    static table = 'members_labels';
    static dependencies = ['labels', 'members'];

    constructor(knex, transaction, {labels}) {
        super(MembersLabelsImporter.table, knex, transaction);
        this.labels = labels;
    }

    async import(quantity) {
        const members = await this.transaction.select('id').from('members');
        this.labels = await this.transaction.select('id').from('labels');

        await this.importForEach(members, quantity ? quantity / members.length : 1);
    }

    generate() {
        if (luck(90)) {
            // 90% of members don't have labels
            return;
        }
        // TODO: Ensure we don't generate the same member label twice
        return {
            id: this.fastFakeObjectId(),
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
