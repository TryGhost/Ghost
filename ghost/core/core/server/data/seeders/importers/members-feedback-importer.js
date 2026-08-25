const { TableImporter } = require('./table-importer');
const { luck, randomDateBetween } = require('../utils/random');
const { fromDatabaseDate, toDatabaseDate } = require('../../../lib/db-date');

class MembersFeedbackImporter extends TableImporter {
  static table = 'members_feedback';
  static dependencies = ['emails', 'email_recipients'];

  constructor(knex, transaction, { emails }) {
    super(MembersFeedbackImporter.table, knex, transaction);
    this.emails = emails;
  }

  async import(quantity) {
    const emailRecipients = await this.transaction
      .select('id', 'opened_at', 'email_id', 'member_id')
      .from('email_recipients');
    this.emails = await this.transaction.select('id', 'post_id').from('emails');

    await this.importForEach(emailRecipients, quantity ? quantity / emailRecipients.length : 1);
  }

  generate() {
    // ~10% of people who opened the email will leave feedback
    if (!this.model.opened_at || luck(90)) {
      return null;
    }

    const openedAt = fromDatabaseDate(this.model.opened_at);
    const laterOn = new Date(openedAt);
    laterOn.setMinutes(laterOn.getMinutes() + 60);
    const feedbackTime = randomDateBetween(openedAt, laterOn);

    const postId = this.emails.find((email) => email.id === this.model.email_id).post_id;
    return {
      id: this.fastFakeObjectId(),
      score: luck(70) ? 1 : 0,
      member_id: this.model.member_id,
      post_id: postId,
      created_at: toDatabaseDate(feedbackTime),
      updated_at: toDatabaseDate(feedbackTime),
    };
  }
}

module.exports = MembersFeedbackImporter;
