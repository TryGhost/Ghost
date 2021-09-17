const utils = require('../../utils');

module.exports = utils.addTable('temp_member_analytic_events', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    event_name: {type: 'string', maxlength: 50, nullable: false},
    created_at: {type: 'dateTime', nullable: false},
    member_id: {type: 'string', maxlength: 24, nullable: false},
    member_status: {type: 'string', maxlength: 50, nullable: false},
    entry_id: {type: 'string', maxlength: 24, nullable: true},
    source_url: {type: 'string', maxlength: 2000, nullable: true},
    metadata: {type: 'string', maxlength: 191, nullable: true}
});
