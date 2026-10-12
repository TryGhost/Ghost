const ghostBookshelf = require('./base');
const logging = require('@tryghost/logging');
const { MEMBER_WELCOME_EMAIL_SLUGS } = require('../services/member-welcome-emails/constants');

const MEMBER_WELCOME_EMAIL_SLUG_SET = new Set(Object.values(MEMBER_WELCOME_EMAIL_SLUGS));

const Automation = ghostBookshelf.Model.extend(
  {
    tableName: 'automations',

    defaults() {
      return {
        status: 'inactive',
        description: '',
      };
    },

    welcomeEmailAutomatedEmail() {
      return this.hasOne('WelcomeEmailAutomatedEmail', 'welcome_email_automation_id');
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

      const previousActive = previousStatus === 'active';
      const currentActive = currentStatus === 'active';

      /** @type {'enabled' | 'disabled'} */
      let transitionType;
      if (!previousActive && currentActive) {
        transitionType = 'enabled';
      } else if (previousActive && !currentActive) {
        transitionType = 'disabled';
      } else {
        return;
      }

      logging.info(
        {
          system: {
            event: `welcome_email.${transitionType}`,
            automation_id: model.id,
            slug,
          },
        },
        `Welcome email automation ${transitionType}`,
      );
    },
  },
  {
    orderDefaultRaw() {
      return '`created_at` ASC';
    },
  },
);

module.exports = {
  Automation: ghostBookshelf.model('Automation', Automation),
};
