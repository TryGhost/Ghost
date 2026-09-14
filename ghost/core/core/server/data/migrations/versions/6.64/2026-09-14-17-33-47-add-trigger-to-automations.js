const logging = require('@tryghost/logging');

const {
  combineNonTransactionalMigrations,
  createAddColumnMigration,
  createSetNullableMigration,
} = require('../../utils');

// Automations used to be selected by their hard-coded `slug`. They are now
// selected by matching this trigger against the member, which lets a site have
// any number of automations — including several with overlapping triggers.
//
// The shape stored here is:
//   {"type":"free"} | {"type":"paid","tiers":"all"} | {"type":"paid","tiers":["<tier id>", ...]}
const TRIGGERS_BY_LEGACY_SLUG = {
  'member-welcome-email-free': { type: 'free' },
  'member-welcome-email-paid': { type: 'paid', tiers: 'all' },
};

const backfillTriggers = {
  config: { transaction: false },
  async up(config) {
    const knex = config.transacting || config.connection;

    // Only ever two rows, named by the constant above.
    await Promise.all(
      Object.entries(TRIGGERS_BY_LEGACY_SLUG).map(async ([slug, trigger]) => {
        const updated = await knex('automations')
          .where('slug', slug)
          .whereNull('trigger_config')
          .update({ trigger_config: JSON.stringify(trigger) });

        if (updated) {
          logging.info(`Backfilled automation trigger for "${slug}"`);
        } else {
          logging.info(`No automation to backfill for "${slug}" - skipping`);
        }
      }),
    );
  },
  async down(config) {
    const knex = config.transacting || config.connection;

    // The column is dropped by the migration below this one, so there is
    // nothing to undo. Kept explicit so the code path is obvious.
    logging.info('Automation triggers are removed with the trigger_config column - nothing to do');
    void knex;
  },
};

module.exports = combineNonTransactionalMigrations(
  createAddColumnMigration('automations', 'trigger_config', {
    type: 'text',
    maxlength: 65535,
    nullable: true,
  }),
  backfillTriggers,
  // Slugs are no longer read by any code. They stay on the two automations that
  // shipped with them so the boot-time seed can keep upserting on slug, but new
  // automations created through the API have no slug at all.
  createSetNullableMigration('automations', 'slug'),
);
