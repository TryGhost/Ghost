const {createAddColumnMigration} = require('../../utils');

// the publish-flow escape valve for gated posts: bypass the divider for this
// post's email and send everyone on the list the full post
module.exports = createAddColumnMigration('posts_meta', 'email_full_post', {
    type: 'boolean',
    nullable: false,
    defaultTo: false
}, {algorithm: 'auto'});
