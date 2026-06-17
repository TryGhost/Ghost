const {addTable} = require('../../utils');

module.exports = addTable('gift_links', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    post_id: {type: 'string', maxlength: 24, nullable: false, references: 'posts.id', cascadeDelete: true},
    token: {type: 'string', maxlength: 64, nullable: false, unique: true},
    status: {
        type: 'string', maxlength: 50, nullable: false, defaultTo: 'active', validations: {
            isIn: [['active', 'inactive']]
        }
    },
    redeemed_count: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0},
    last_redeemed_at: {type: 'dateTime', nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true},
    '@@INDEXES@@': [
        ['post_id', 'status']
    ]
});
