const {
    combineNonTransactionalMigrations,
    createAddColumnMigration,
    createAddIndexMigration,
    createSetNullableMigration
} = require('../../utils');

const addGiftColumn = (name, definition) => createAddColumnMigration(
    'gifts',
    name,
    definition,
    {algorithm: 'auto'}
);

module.exports = combineNonTransactionalMigrations(
    addGiftColumn('buyer_name', {type: 'string', maxlength: 191, nullable: true}),
    addGiftColumn('recipient_name', {type: 'string', maxlength: 191, nullable: true}),
    addGiftColumn('personal_message', {type: 'text', maxlength: 500, nullable: true}),
    createSetNullableMigration('gifts', 'buyer_email'),
    createSetNullableMigration('gifts', 'stripe_checkout_session_id'),
    createSetNullableMigration('gifts', 'stripe_payment_intent_id'),
    createSetNullableMigration('gifts', 'expires_at'),
    createSetNullableMigration('gifts', 'purchased_at'),
    addGiftColumn('checkout_started_at', {type: 'dateTime', nullable: true}),
    createAddIndexMigration('gifts', ['status', 'checkout_started_at'])
);
