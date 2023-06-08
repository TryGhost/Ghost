const ghostBookshelf = require('./base');

const MailEvent = ghostBookshelf.Model.extend({
    tableName: 'mail_events',
    defaults() {
        return {};
    }
}, {});

module.exports = {
    /**
     * @type {object}
     * @property {function} add
     */
    MailEvent: ghostBookshelf.model('MailEvent', MailEvent)
};
