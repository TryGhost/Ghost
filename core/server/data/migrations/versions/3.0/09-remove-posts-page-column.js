const {createDropColumnMigration} = require('../../utils');

module.exports = createDropColumnMigration('posts', 'page', {
    type: 'bool',
    nullable: false,
    defaultTo: false
});
