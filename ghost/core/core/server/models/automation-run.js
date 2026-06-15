const ghostBookshelf = require('./base');

const AutomationRun = ghostBookshelf.Model.extend({
    tableName: 'automation_runs',

    automation() {
        return this.belongsTo('Automation', 'automation_id', 'id');
    },

    member() {
        return this.belongsTo('Member', 'member_id', 'id');
    },

    automationRunSteps() {
        return this.hasMany('AutomationRunStep', 'automation_run_id', 'id');
    }
});

module.exports = {
    AutomationRun: ghostBookshelf.model('AutomationRun', AutomationRun)
};
