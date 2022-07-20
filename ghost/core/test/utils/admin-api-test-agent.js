const TestAgent = require('./test-agent');
const errors = require('@tryghost/errors');
const DataGenerator = require('./fixtures/data-generator');

const ownerUser = {
    email: DataGenerator.Content.users[0].email,
    password: DataGenerator.Content.users[0].password
};

/**
 * @constructor
 * @param {Object} app  Ghost express app instance
 * @param {Object} options
 * @param {String} options.apiURL
 * @param {String} options.originURL
 */
class AdminAPITestAgent extends TestAgent {
    constructor(app, options) {
        super(app, options);
    }

    async loginAs(email, password) {
        const res = await this.post('/session/')
            .body({
                grant_type: 'password',
                username: email,
                password: password
            });

        if (res.statusCode === 302) {
            // This can happen if you already have an instance running e.g. if you've been using Ghost CLI recently
            throw new errors.IncorrectUsageError({
                message: 'Ghost is redirecting, do you have an instance already running on port 2369?'
            });
        } else if (res.statusCode !== 200 && res.statusCode !== 201) {
            throw new errors.IncorrectUsageError({
                message: res.body.errors[0].message
            });
        }

        return res.headers['set-cookie'];
    }

    async loginAsOwner() {
        await this.loginAs(ownerUser.email, ownerUser.password);
    }
}

module.exports = AdminAPITestAgent;
