const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('newsletters', 'show_comment_cta', {
    type: 'boolean',
    nullable: false,
    defaultTo: true
});
