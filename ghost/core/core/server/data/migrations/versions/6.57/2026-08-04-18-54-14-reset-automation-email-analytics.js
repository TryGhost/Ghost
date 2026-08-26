const logging = require('@tryghost/logging');
const { createTransactionalMigration } = require('../../utils');

module.exports = createTransactionalMigration(
  async function up(knex) {
    logging.info('Resetting automation email analytics counts');

    const updatedRevisions = await knex('automation_action_revisions').update({
      email_sent_count: null,
      email_opened_count: null,
      email_clicked_count: null,
    });

    logging.info(
      `Reset automation email analytics counts for ${updatedRevisions} action revisions`,
    );

    const deletedRecipients = await knex('automated_email_recipients')
      .whereNotNull('automation_action_revision_id')
      .del();

    logging.info(`Deleted ${deletedRecipients} automation email recipient rows`);
  },
  async function down() {
    logging.info('Skipping rollback for automation email analytics reset');
  },
);
