const TestAgent = require('./test-agent');
const errors = require('@tryghost/errors');
const DataGenerator = require('../fixtures/data-generator');

const roleMap = {
    owner: 0,
    admin: 1,
    editor: 2,
    author: 3,
    contributor: 7
};

const getRoleUserFromFixtures = (role) => {
    const {email, password} = DataGenerator.Content.users[roleMap[role]];
    return {email, password};
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

    async loginAs(email, password, role) {
        if (role) {
            let user = getRoleUserFromFixtures(role);
            email = user.email;
            password = user.password;
        }

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
        } else if (res.statusCode === 404 && role) {
            throw new errors.IncorrectUsageError({
                message: `Unable to login as ${role} - user not found. Did you pass 'users' to fixtureManager.init() ?`
            });
        } else if (res.statusCode !== 200 && res.statusCode !== 201) {
            throw new errors.IncorrectUsageError({
                message: res.body.errors[0].message
            });
        }

        return res.headers['set-cookie'];
    }

    async loginAsOwner() {
        await this.loginAs(null, null, 'owner');
    }

    async loginAsAdmin() {
        await this.loginAs(null, null, 'admin');
    }

    async loginAsEditor() {
        await this.loginAs(null, null, 'editor');
    }

    async loginAsAuthor() {
        await this.loginAs(null, null, 'author');
    }

    async loginAsContributor() {
        await this.loginAs(null, null, 'contributor');
    }
}

module.exports = AdminAPITestAgent;
