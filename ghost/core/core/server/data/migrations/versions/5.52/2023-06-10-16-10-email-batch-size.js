const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('setting', 'mailgun_batch_size', {
    type: 'number',
    nullable: true
});