const {
    addTable,
    combineNonTransactionalMigrations,
    createAddColumnMigration
} = require('../../utils');

const addGiftColumn = (name, definition) => createAddColumnMigration(
    'gifts',
    name,
    definition,
    {algorithm: 'auto'}
);

const giftDeliveries = {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    gift_id: {type: 'string', maxlength: 24, nullable: false, unique: true, references: 'gifts.id', cascadeDelete: true},
    recipient_email: {type: 'string', maxlength: 191, nullable: false, validations: {isEmail: true}},
    status: {
        type: 'string', maxlength: 50, nullable: false, defaultTo: 'pending', validations: {
            isIn: [['pending', 'sending', 'sent', 'failed', 'cancelled']]
        }
    },
    started_at: {type: 'dateTime', nullable: true},
    email_sent_at: {type: 'dateTime', nullable: true},
    email_provider_message_id: {type: 'string', maxlength: 1000, nullable: true},
    outcome: {
        type: 'string', maxlength: 50, nullable: false, defaultTo: 'unknown', validations: {
            isIn: [['unknown', 'delivered', 'temporary_failed', 'permanent_failed']]
        }
    },
    outcome_at: {type: 'dateTime', nullable: true},
    outcome_error: {type: 'text', maxlength: 65535, nullable: true},
    '@@INDEXES@@': [
        {columns: ['email_provider_message_id'], length: 31},
        ['status', 'started_at']
    ]
};

module.exports = combineNonTransactionalMigrations(
    addGiftColumn('buyer_name', {type: 'string', maxlength: 191, nullable: true}),
    addGiftColumn('recipient_name', {type: 'string', maxlength: 191, nullable: true}),
    addGiftColumn('personal_message', {type: 'text', maxlength: 500, nullable: true}),
    addGiftColumn('available_at', {type: 'dateTime', nullable: true}),
    addTable('gift_deliveries', giftDeliveries)
);
