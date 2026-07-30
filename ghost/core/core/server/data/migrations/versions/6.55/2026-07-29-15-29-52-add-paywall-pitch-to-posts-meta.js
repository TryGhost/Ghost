const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('posts_meta', 'paywall_pitch', {
    type: 'string',
    maxlength: 300,
    nullable: true
}, {algorithm: 'auto'});
