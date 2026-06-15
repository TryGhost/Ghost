const ghostBookshelf = require('./base');

const AutomationActionEdge = ghostBookshelf.Model.extend({
    tableName: 'automation_action_edges',
    hasTimestamps: false,

    sourceAutomationAction() {
        return this.belongsTo('AutomationAction', 'source_action_id', 'id');
    },

    targetAutomationAction() {
        return this.belongsTo('AutomationAction', 'target_action_id', 'id');
    }
});

module.exports = {
    AutomationActionEdge: ghostBookshelf.model('AutomationActionEdge', AutomationActionEdge)
};
