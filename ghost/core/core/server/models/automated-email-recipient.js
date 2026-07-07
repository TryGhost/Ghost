module.exports = function (ghostBookshelf) {
    const AutomatedEmailRecipient = ghostBookshelf.Model.extend({
        tableName: 'automated_email_recipients',
        hasTimestamps: true,

        automatedEmail() {
            return this.belongsTo('WelcomeEmailAutomatedEmail', 'automated_email_id');
        },
        member() {
            return this.belongsTo('Member', 'member_id');
        }
    });

    const AutomatedEmailRecipients = ghostBookshelf.Collection.extend({
        model: AutomatedEmailRecipient
    });

    return {
        AutomatedEmailRecipient: ghostBookshelf.model('AutomatedEmailRecipient', AutomatedEmailRecipient),
        AutomatedEmailRecipients: ghostBookshelf.collection('AutomatedEmailRecipients', AutomatedEmailRecipients)
    };
};

Object.assign(module.exports, module.exports(require('./base')));
