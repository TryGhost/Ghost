const {addTable} = require('../../utils');

module.exports = addTable('recommendation_click_events', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    recommendation_id: {type: 'string', maxlength: 24, nullable: false, references: 'recommendations.id', unique: false, cascadeDelete: true},
    member_id: {type: 'string', maxlength: 24, nullable: true, references: 'members.id', unique: false, setNullDelete: true},
    created_at: {type: 'dateTime', nullable: false}
});
