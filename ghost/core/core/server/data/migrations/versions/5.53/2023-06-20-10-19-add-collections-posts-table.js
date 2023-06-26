// For information on writing migrations, see https://www.notion.so/ghost/Database-migrations-eb5b78c435d741d2b34a582d57c24253

const {addTable} = require('../../utils');

module.exports = addTable('collections_posts', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    collection_id: {type: 'string', maxlength: 24, nullable: false, references: 'collections.id', cascadeDelete: true},
    post_id: {type: 'string', maxlength: 24, nullable: false, references: 'posts.id', cascadeDelete: true},
    sort_order: {type: 'integer', nullable: false, unsigned: true, defaultTo: 0}
});
