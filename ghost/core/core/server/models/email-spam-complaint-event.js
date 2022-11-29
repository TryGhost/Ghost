const errors = require('@tryghost/errors');
const ghostBookshelf = require('./base');

const EmailSpamComplaintEvent = ghostBookshelf.Model.extend({
    tableName: 'email_spam_complaint_events'
}, {
    async edit() {
        throw new errors.IncorrectUsageError({
            message: 'Cannot edit EmailSpamComplaintEvent'
        });
    },

    async destroy() {
        throw new errors.IncorrectUsageError({
            message: 'Cannot destroy EmailSpamComplaintEvent'
        });
    }
});

module.exports = {
    EmailSpamComplaintEvent: ghostBookshelf.model('EmailSpamComplaintEvent', EmailSpamComplaintEvent)
};
