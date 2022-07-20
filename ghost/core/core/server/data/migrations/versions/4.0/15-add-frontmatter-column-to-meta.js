const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('posts_meta', 'frontmatter', {
    type: 'text',
    maxlength: 65535,
    nullable: true
});
