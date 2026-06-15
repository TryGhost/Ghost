const ghostBookshelf = require('./base');

const AutomationRunStep = ghostBookshelf.Model.extend({
    tableName: 'automation_run_steps',

    automationRun() {
        return this.belongsTo('AutomationRun', 'automation_run_id', 'id');
    },

    automationActionRevision() {
        return this.belongsTo('AutomationActionRevision', 'automation_action_revision_id', 'id');
    }
});

module.exports = {
    AutomationRunStep: ghostBookshelf.model('AutomationRunStep', AutomationRunStep)
};
