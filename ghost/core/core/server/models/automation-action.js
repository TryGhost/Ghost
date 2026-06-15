const ghostBookshelf = require('./base');

const AutomationAction = ghostBookshelf.Model.extend({
    tableName: 'automation_actions',

    automation() {
        return this.belongsTo('Automation', 'automation_id', 'id');
    },

    automationActionRevisions() {
        return this.hasMany('AutomationActionRevision', 'action_id', 'id');
    },

    outgoingAutomationActionEdges() {
        return this.hasMany('AutomationActionEdge', 'source_action_id', 'id');
    },

    incomingAutomationActionEdges() {
        return this.hasMany('AutomationActionEdge', 'target_action_id', 'id');
    }
});

module.exports = {
    AutomationAction: ghostBookshelf.model('AutomationAction', AutomationAction)
};
