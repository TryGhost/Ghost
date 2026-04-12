const ghostBookshelf = require('./base');

const WelcomeEmailAutomationRun = ghostBookshelf.Model.extend({
    tableName: 'welcome_email_automation_runs',

    defaults() {
        return {
            stepAttempts: 0
        };
    },

    welcomeEmailAutomation() {
        return this.belongsTo('WelcomeEmailAutomation', 'welcome_email_automation_id', 'id');
    },

    member() {
        return this.belongsTo('Member', 'member_id', 'id');
    },

    nextWelcomeEmailAutomatedEmail() {
        return this.belongsTo('WelcomeEmailAutomatedEmail', 'next_welcome_email_automated_email_id', 'id');
    }
});

module.exports = {
    WelcomeEmailAutomationRun: ghostBookshelf.model('WelcomeEmailAutomationRun', WelcomeEmailAutomationRun)
};
