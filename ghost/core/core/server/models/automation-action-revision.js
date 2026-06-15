const ghostBookshelf = require('./base');

const AutomationActionRevision = ghostBookshelf.Model.extend({
    tableName: 'automation_action_revisions',
    hasTimestamps: ['created_at'],

    automationAction() {
        return this.belongsTo('AutomationAction', 'action_id', 'id');
    },

    emailDesignSetting() {
        return this.belongsTo('EmailDesignSetting', 'email_design_setting_id', 'id');
    }
});

module.exports = {
    AutomationActionRevision: ghostBookshelf.model('AutomationActionRevision', AutomationActionRevision)
};
