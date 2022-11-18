const {AbstractEmailSuppressionList, EmailSuppressionData} = require('@tryghost/email-suppression-list');

class InMemoryEmailSuppressionList extends AbstractEmailSuppressionList {
    async removeEmail(email) {
        if (email === 'fail@member.test') {
            return false;
        }
        return true;
    }

    async getSuppressionData(email) {
        if (email === 'spam@member.test') {
            return new EmailSuppressionData(true, {
                timestamp: new Date(),
                reason: 'spam'
            });
        }
        if (email === 'fail@member.test') {
            return new EmailSuppressionData(true, {
                timestamp: new Date(),
                reason: 'fail'
            });
        }
        return new EmailSuppressionData(false);
    }

    async init() {
        return;
    }
}

module.exports = new InMemoryEmailSuppressionList();
