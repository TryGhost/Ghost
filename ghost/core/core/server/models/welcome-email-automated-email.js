const ghostBookshelf = require('./base');
const urlUtils = require('../../shared/url-utils');
const lexicalLib = require('../lib/lexical');

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
