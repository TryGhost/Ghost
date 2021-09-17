const ghostBookshelf = require('./base');

const MemberAnalyticEvent = ghostBookshelf.Model.extend({
    tableName: 'temp_member_analytic_events'
});

module.exports = {
    MemberAnalyticEvent: ghostBookshelf.model('MemberAnalyticEvent', MemberAnalyticEvent)
};
