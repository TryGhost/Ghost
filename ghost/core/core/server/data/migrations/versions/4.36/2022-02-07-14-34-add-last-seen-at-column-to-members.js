const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration(
    'members',
    'last_seen_at',
    {
        type: 'dateTime',
        nullable: true
    }
);
