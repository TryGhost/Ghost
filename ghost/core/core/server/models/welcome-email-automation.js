const ghostBookshelf = require('./base');
const logging = require('@tryghost/logging');
const {MEMBER_WELCOME_EMAIL_SLUGS} = require('../services/member-welcome-emails/constants');

const MEMBER_WELCOME_EMAIL_SLUG_SET = new Set(Object.values(MEMBER_WELCOME_EMAIL_SLUGS));

const WelcomeEmailAutomation = ghostBookshelf.Model.extend({
    tableName: 'welcome_email_automations',

    defaults() {
        return {
            status: 'inactive'
        };
    },

    welcomeEmailAutomatedEmail() {
        return this.hasOne('WelcomeEmailAutomatedEmail', 'welcome_email_automation_id');
    },

    welcomeEmailAutomatedEmails() {
        return this.hasMany('WelcomeEmailAutomatedEmail', 'welcome_email_automation_id');
    },

    onSaved(model) {
        if (!model?.id) {
            return;
        }

        const slug = model.get('slug');

        if (!MEMBER_WELCOME_EMAIL_SLUG_SET.has(slug)) {
            return;
        }

        const previousStatus = model.previous('status');
        const currentStatus = model.get('status');
        const isNewModel = previousStatus === undefined;
        const isEnableTransition = currentStatus === 'active' && (isNewModel || previousStatus === 'inactive');
        const isDisableTransition = previousStatus === 'active' && currentStatus === 'inactive';

        if (!isEnableTransition && !isDisableTransition) {
            return;
        }

        logging.info({
            system: {
                event: isEnableTransition ? 'welcome_email.enabled' : 'welcome_email.disabled',
                automation_id: model.id,
                slug
            }
        }, isEnableTransition ? 'Welcome email automation enabled' : 'Welcome email automation disabled');
    }
});

module.exports = {
    WelcomeEmailAutomation: ghostBookshelf.model('WelcomeEmailAutomation', WelcomeEmailAutomation)
};
