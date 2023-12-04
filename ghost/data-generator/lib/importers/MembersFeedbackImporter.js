const TableImporter = require('./TableImporter');
const {faker} = require('@faker-js/faker');
const {luck} = require('../utils/random');
const dateToDatabaseString = require('../utils/database-date');

class MembersFeedbackImporter extends TableImporter {
    static table = 'members_feedback';
    static dependencies = ['emails', 'email_recipients'];

    constructor(knex, transaction, {emails}) {
        super(MembersFeedbackImporter.table, knex, transaction);
        this.emails = emails;
    }

    async import(quantity) {
        const emailRecipients = await this.transaction.select('id', 'opened_at', 'email_id', 'member_id').from('email_recipients');
        this.emails = await this.transaction.select('id', 'post_id').from('emails');

        await this.importForEach(emailRecipients, quantity ? quantity / emailRecipients.length : 1);
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
