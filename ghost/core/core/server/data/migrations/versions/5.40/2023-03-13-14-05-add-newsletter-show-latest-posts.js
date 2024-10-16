const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('newsletters', 'show_latest_posts', {
    type: 'boolean',
    nullable: false,
    defaultTo: false
});
