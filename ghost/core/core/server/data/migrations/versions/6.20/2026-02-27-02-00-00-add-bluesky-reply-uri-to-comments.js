const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('comments', 'bluesky_reply_uri', {
    type: 'string',
    maxlength: 500,
    nullable: true
});
