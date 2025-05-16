const TestAgent = require('./test-agent');
const errors = require('@tryghost/errors');
const DataGenerator = require('../fixtures/data-generator');
const jwt = require('jsonwebtoken');

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

const getUserApiKeyForRole = (role) => {
    const roleIndex = Object.keys(roleMap).indexOf(role);
    const {id: apiKeyId, secret: apiKeySecret} = DataGenerator.forKnex.user_api_keys[roleIndex];
    return {apiKeyId, apiKeySecret};
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

    /**
     * Gets a staff token for the specified role and sets it as the Authorization header
     * @param {String} role - The role to get a token for (owner, admin, editor, etc.)
     * @returns {Promise<void>}
     */
    async useStaffTokenFor(role) {
        const {apiKeyId, apiKeySecret} = getUserApiKeyForRole(role);

        // Create a JWT token with the user's personal token
        const token = jwt.sign(
            {},
            Buffer.from(apiKeySecret, 'hex'),
            {
                keyid: apiKeyId,
                algorithm: 'HS256',
                expiresIn: '5m',
                audience: '/admin/',
                issuer: apiKeyId
            }
        );

        // Set the Authorization header for subsequent requests
        this.defaults.headers = {
            ...this.defaults.headers,
            Authorization: `Ghost ${token}`
        };
    }

    /**
     * Gets a staff token for the owner role and sets it as the Authorization header
     * @returns {Promise<void>}
     */
    async useStaffTokenForOwner() {
        await this.useStaffTokenFor('owner');
    }

    async useStaffTokenForAdmin() {
        await this.useStaffTokenFor('admin');
    }

    async useStaffTokenForEditor() {
        await this.useStaffTokenFor('editor');
    }

    async useStaffTokenForAuthor() {
        await this.useStaffTokenFor('author');
    }

    async useStaffTokenForContributor() {
        await this.useStaffTokenFor('contributor');
    }
}

module.exports = AdminAPITestAgent;
