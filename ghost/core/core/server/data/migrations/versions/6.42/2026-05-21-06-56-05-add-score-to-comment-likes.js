const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('comment_likes', 'score', {
    type: 'integer',
    nullable: false,
    defaultTo: 1
});
