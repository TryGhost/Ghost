const {combineNonTransactionalMigrations, createAddColumnMigration} = require('../../utils');

const addGiftColumn = (name, definition) => createAddColumnMigration(
    'gifts',
    name,
    definition,
    {algorithm: 'auto'}
);

module.exports = combineNonTransactionalMigrations(
    addGiftColumn('delivery_method', {
        type: 'string',
        maxlength: 50,
        nullable: false,
        defaultTo: 'link',
        validations: {isIn: [['link', 'email']]}
    }),
    addGiftColumn('recipient_email', {
        type: 'string',
        maxlength: 191,
        nullable: true,
        validations: {isEmail: true}
    }),
    addGiftColumn('recipient_name', {type: 'string', maxlength: 191, nullable: true}),
    addGiftColumn('buyer_name', {type: 'string', maxlength: 191, nullable: true}),
    addGiftColumn('personal_message', {type: 'text', maxlength: 500, nullable: true}),
    addGiftColumn('deliver_at', {type: 'dateTime', nullable: true}),
    addGiftColumn('delivery_status', {
        type: 'string',
        maxlength: 50,
        nullable: false,
        defaultTo: 'pending',
        validations: {isIn: [['pending', 'sending', 'sent', 'failed']]}
    }),
    addGiftColumn('delivery_attempts', {type: 'integer', nullable: false, unsigned: true, defaultTo: 0}),
    addGiftColumn('delivery_attempt_at', {type: 'dateTime', nullable: true}),
    addGiftColumn('email_sent_at', {type: 'dateTime', nullable: true}),
    addGiftColumn('email_provider_message_id', {type: 'string', maxlength: 1000, nullable: true}),
    addGiftColumn('delivery_outcome', {
        type: 'string',
        maxlength: 50,
        nullable: false,
        defaultTo: 'unknown',
        validations: {isIn: [['unknown', 'delivered', 'temporary_failed', 'permanent_failed']]}
    }),
    addGiftColumn('delivery_outcome_at', {type: 'dateTime', nullable: true}),
    addGiftColumn('delivery_outcome_error', {type: 'text', maxlength: 65535, nullable: true})
);
