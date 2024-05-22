const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('newsletters', 'created_at', {
    type: 'dateTime',
    nullable: true
});
