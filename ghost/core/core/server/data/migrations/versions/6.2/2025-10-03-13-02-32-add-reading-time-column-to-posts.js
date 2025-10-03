const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('posts', 'reading_time', {
    type: 'integer',
    nullable: true,
    unsigned: true
});
