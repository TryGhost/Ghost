const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('newsletters', 'show_post_title_section', {
    type: 'boolean',
    nullable: false,
    defaultTo: true
});
