const {AbstractEmailSuppressionList, EmailSuppressionData} = require('./email-suppression-list');

module.exports = class InMemoryEmailSuppressionList extends AbstractEmailSuppressionList {
    store = ['spam@member.test', 'fail@member.test'];

    async removeEmail(email) {
        if ((email === 'fail@member.test' || email === 'spam@member.test') && this.store.includes(email)) {
            this.store = this.store.filter(el => el !== email);

            setTimeout(() => this.store.push(email), 3000);
            return true;
        }

        return false;
    }

    async getSuppressionData(email) {
        if (email === 'spam@member.test' && this.store.includes(email)) {
            return new EmailSuppressionData(true, {
                timestamp: new Date(),
                reason: 'spam'
            });
        }
        if (email === 'fail@member.test' && this.store.includes(email)) {
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
};
