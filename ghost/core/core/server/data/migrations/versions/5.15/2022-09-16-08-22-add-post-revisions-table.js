const {addTable} = require('../../utils');

module.exports = addTable('post_revisions', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    post_id: {type: 'string', maxlength: 24, nullable: false, index: true},
    lexical: {type: 'text', maxlength: 1000000000, fieldtype: 'long', nullable: true},
    created_at_ts: {type: 'bigInteger', nullable: false},
    created_at: {type: 'dateTime', nullable: false}
});
