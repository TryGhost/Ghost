const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('newsletters', 'updated_at', {
    type: 'dateTime',
    nullable: true
});
