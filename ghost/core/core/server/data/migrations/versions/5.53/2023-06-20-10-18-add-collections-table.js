// For information on writing migrations, see https://www.notion.so/ghost/Database-migrations-eb5b78c435d741d2b34a582d57c24253

const {addTable} = require('../../utils');

module.exports = addTable('collections', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    title: {type: 'string', maxlength: 191, nullable: false},
    slug: {type: 'string', maxlength: 191, nullable: false, unique: true},
    description: {type: 'string', maxlength: 2000, nullable: true},
    type: {type: 'string', maxlength: 50, nullable: false},
    filter: {type: 'text', maxlength: 1000000000, nullable: true},
    feature_image: {type: 'string', maxlength: 2000, nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true}
});
