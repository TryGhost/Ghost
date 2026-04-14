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
        const relation = this.hasOne('WelcomeEmailAutomatedEmail', 'welcome_email_automation_id');

        relation.query((qb) => {
            qb.whereNotExists(function () {
                this.select(1)
                    .from('welcome_email_automated_emails as previous_emails')
                    .whereRaw('previous_emails.next_welcome_email_automated_email_id = welcome_email_automated_emails.id')
                    .whereRaw('previous_emails.welcome_email_automation_id = welcome_email_automated_emails.welcome_email_automation_id');
            });
            qb.orderBy('welcome_email_automated_emails.created_at', 'asc');
            qb.orderBy('welcome_email_automated_emails.id', 'asc');
        });

        return relation;
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
