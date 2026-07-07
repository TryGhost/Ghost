module.exports = function (ghostBookshelf) {
    const EmailRecipientFailure = ghostBookshelf.Model.extend({
        tableName: 'email_recipient_failures',
        hasTimestamps: false,

        defaults() {
            return {
            };
        },

        email() {
            return this.belongsTo('Email', 'email_id');
        },

        member() {
            return this.belongsTo('Member', 'member_id');
        },

        emailRecipient() {
            return this.belongsTo('EmailRecipient', 'email_recipient_id');
        }
    }, {

    });

    return {
        EmailRecipientFailure: ghostBookshelf.model('EmailRecipientFailure', EmailRecipientFailure)
    };
};

Object.assign(module.exports, module.exports(require('./base')));
