const {
    combineNonTransactionalMigrations,
    createAddColumnMigration,
    createAddIndexMigration,
    createDropNullableMigration,
    createNonTransactionalMigration,
    createSetNullableMigration
} = require('../../utils');

const backfillCheckoutStartedAt = createNonTransactionalMigration(
    async function up(knex) {
        await knex('gifts')
            .whereNull('checkout_started_at')
            .update({checkout_started_at: knex.ref('purchased_at')});
    },
    async function down() {}
);

const migration = combineNonTransactionalMigrations(
    createSetNullableMigration('gifts', 'buyer_email'),
    createSetNullableMigration('gifts', 'stripe_checkout_session_id'),
    createSetNullableMigration('gifts', 'stripe_payment_intent_id'),
    createSetNullableMigration('gifts', 'expires_at'),
    createSetNullableMigration('gifts', 'purchased_at'),
    createAddColumnMigration('gifts', 'checkout_started_at', {
        type: 'dateTime',
        nullable: true
    }),
    backfillCheckoutStartedAt,
    createDropNullableMigration('gifts', 'checkout_started_at'),
    createAddIndexMigration('gifts', ['status', 'checkout_started_at'])
);

module.exports = {
    config: migration.config,

    async up(config) {
        await migration.up(config);
    },

    async down(config) {
        // Pending rows cannot be represented by the previous non-null schema.
        await config.connection('gifts').where({status: 'payment_pending'}).del();
        await migration.down(config);
    }
};
