const ghostBookshelf = require('./base');

const WelcomeEmailAutomation = ghostBookshelf.Model.extend({
    tableName: 'welcome_email_automations',

    defaults() {
        return {
            status: 'inactive'
        };
    },

    welcomeEmailAutomatedEmails() {
        return this.hasMany('WelcomeEmailAutomatedEmail', 'welcome_email_automation_id');
    }
});

module.exports = {
    WelcomeEmailAutomation: ghostBookshelf.model('WelcomeEmailAutomation', WelcomeEmailAutomation)
};
