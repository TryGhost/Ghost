const ghostBookshelf = require('./base');
const errors = require('@tryghost/errors');
const urlUtils = require('../../shared/url-utils');
const lexicalLib = require('../lib/lexical');
const {DEFAULT_EMAIL_DESIGN_SETTING_SLUG} = require('../services/member-welcome-emails/constants');

const WelcomeEmailAutomatedEmail = ghostBookshelf.Model.extend({
    tableName: 'welcome_email_automated_emails',

    /**
     * @returns {import('bookshelf').Model}
     */
    emailDesignSetting() {
        return this.belongsTo('EmailDesignSetting', 'email_design_setting_id', 'id');
    },

    welcomeEmailAutomation() {
        return this.belongsTo('WelcomeEmailAutomation', 'welcome_email_automation_id', 'id');
    },

    nextWelcomeEmailAutomatedEmail() {
        return this.belongsTo('WelcomeEmailAutomatedEmail', 'next_welcome_email_automated_email_id', 'id');
    },

    parse() {
        const attrs = ghostBookshelf.Model.prototype.parse.apply(this, arguments);

        // transform URLs from __GHOST_URL__ to absolute
        if (attrs.lexical) {
            attrs.lexical = urlUtils.transformReadyToAbsolute(attrs.lexical);
        }

        return attrs;
    },

    async onCreating(model, attrs, options) {
        if (!model.get('email_design_setting_id')) {
            const emailDesignSetting = await ghostBookshelf.model('EmailDesignSetting').findOne({
                slug: DEFAULT_EMAIL_DESIGN_SETTING_SLUG
            }, options);

            if (!emailDesignSetting) {
                throw new errors.InternalServerError({
                    message: 'Missing default email design setting for automated emails'
                });
            }

            model.set('email_design_setting_id', emailDesignSetting.get('id'));
        }

        return ghostBookshelf.Model.prototype.onCreating.call(this, model, attrs, options);
    },

    // Alternative to Bookshelf's .format() that is only called when writing to db
    formatOnWrite(attrs) {
        // Ensure lexical URLs are stored as transform-ready with __GHOST_URL__ representing config.url
        if (attrs.lexical) {
            attrs.lexical = urlUtils.lexicalToTransformReady(attrs.lexical, {
                nodes: lexicalLib.nodes,
                transformMap: lexicalLib.urlTransformMap
            });
        }

        return attrs;
    }
});

module.exports = {
    WelcomeEmailAutomatedEmail: ghostBookshelf.model('WelcomeEmailAutomatedEmail', WelcomeEmailAutomatedEmail)
};
