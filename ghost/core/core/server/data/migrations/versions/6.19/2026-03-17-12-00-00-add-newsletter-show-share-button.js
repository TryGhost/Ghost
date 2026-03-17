const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('newsletters', 'show_share_button', {
    type: 'boolean',
    nullable: false,
    defaultTo: false
});
