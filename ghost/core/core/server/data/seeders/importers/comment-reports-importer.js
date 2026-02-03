const TableImporter = require('./table-importer');
const {faker} = require('@faker-js/faker');
const {luck} = require('../utils/random');
const dateToDatabaseString = require('../utils/database-date');

class CommentReportsImporter extends TableImporter {
    static table = 'comment_reports';
    static dependencies = ['comments'];

    constructor(knex, transaction) {
        super(CommentReportsImporter.table, knex, transaction);
    }

    async import(quantity) {
        const comments = await this.transaction.select('id', 'member_id', 'created_at').from('comments');

        if (comments.length === 0) {
            return;
        }

        this.members = await this.transaction.select('id', 'created_at').from('members');

        // When quantity is explicit, we want to generate exactly that many reports
        // distributed across comments. When not specified, use probabilistic generation.
        if (quantity) {
            this.explicitQuantity = true;
            const perComment = Math.max(1, Math.ceil(quantity / comments.length));
            await this.importForEach(comments, perComment);
        } else {
            this.explicitQuantity = false;
            // Each comment gets one chance to be reported (~3% probability in generate())
            await this.importForEach(comments, 1);
        }
    }

    setReferencedModel(model) {
        this.model = model;
        // Any member can report except the comment author
        this.possibleReporters = this.members.filter(member => member.id !== model.member_id);
    }

    generate() {
        // When no explicit quantity, ~3% of comments get reported
        if (!this.explicitQuantity && luck(97)) {
            return null;
        }

        if (this.possibleReporters.length === 0) {
            return null;
        }

        const commentCreatedAt = new Date(this.model.created_at);
        const now = new Date();
        const reportTime = faker.date.between(commentCreatedAt, now);

        const reporter = this.possibleReporters[faker.datatype.number(this.possibleReporters.length - 1)];

        return {
            id: this.fastFakeObjectId(),
            comment_id: this.model.id,
            member_id: reporter.id,
            created_at: dateToDatabaseString(reportTime),
            updated_at: dateToDatabaseString(reportTime)
        };
    }
}

module.exports = CommentReportsImporter;
