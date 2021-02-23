const {addTable} = require('../../utils');

// Schema snapshot from v4.0
const postsMetaSchema = {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    post_id: {type: 'string', maxlength: 24, nullable: false, references: 'posts.id', unique: true},
    og_image: {type: 'string', maxlength: 2000, nullable: true},
    og_title: {type: 'string', maxlength: 300, nullable: true},
    og_description: {type: 'string', maxlength: 500, nullable: true},
    twitter_image: {type: 'string', maxlength: 2000, nullable: true},
    twitter_title: {type: 'string', maxlength: 300, nullable: true},
    twitter_description: {type: 'string', maxlength: 500, nullable: true},
    meta_title: {type: 'string', maxlength: 2000, nullable: true, validations: {isLength: {max: 300}}},
    meta_description: {type: 'string', maxlength: 2000, nullable: true, validations: {isLength: {max: 500}}},
    email_subject: {type: 'string', maxlength: 300, nullable: true},
    frontmatter: {type: 'text', maxlength: 65535, nullable: true}
};

module.exports = addTable('posts_meta', postsMetaSchema);
