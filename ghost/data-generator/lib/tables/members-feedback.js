const TableImporter = require('./base');
const {faker} = require('@faker-js/faker');
const {luck} = require('../utils/random');
const dateToDatabaseString = require('../utils/database-date');

class MembersFeedbackImporter extends TableImporter {
    static table = 'members_feedback';

    constructor(knex, {emails}) {
        super(MembersFeedbackImporter.table, knex);
        this.emails = emails;
    }

    setImportOptions({model}) {
        this.model = model;
    }

    generate() {
        // ~10% of people who opened the email will leave feedback
        if (!this.model.opened_at || luck(90)) {
            return null;
        }

        const openedAt = new Date(this.model.opened_at);
        const laterOn = new Date(this.model.opened_at);
        laterOn.setMinutes(laterOn.getMinutes() + 60);
        const feedbackTime = new Date(openedAt.valueOf() + (Math.random() * (laterOn.valueOf() - openedAt.valueOf())));

        const postId = this.emails.find(email => email.id === this.model.email_id).post_id;
        return {
            id: faker.database.mongodbObjectId(),
            score: luck(70) ? 1 : 0,
            member_id: this.model.member_id,
            post_id: postId,
            created_at: dateToDatabaseString(feedbackTime),
            updated_at: dateToDatabaseString(feedbackTime)
        };
    }
}

module.exports = MembersFeedbackImporter;
