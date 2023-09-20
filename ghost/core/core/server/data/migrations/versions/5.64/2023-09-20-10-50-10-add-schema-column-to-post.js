const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('posts', 'schema', {
    type: 'string',
    maxlength: 50,
    nullable: false,
    defaultTo: 'article',
    validations: {
        isIn: [['article', 'newsArticle']]
    }
});
