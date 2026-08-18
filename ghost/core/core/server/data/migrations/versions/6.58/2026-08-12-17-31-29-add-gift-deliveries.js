const {addTable} = require('../../utils');

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
    '@@INDEXES@@': [
        ['status', 'started_at']
    ]
};

module.exports = addTable('gift_deliveries', giftDeliveries);
