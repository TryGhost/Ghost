const TestAgent = require('./test-agent');
const errors = require('@tryghost/errors');

/**
 * NOTE: this class is not doing much at the moment. It's rather a placeholder to put
 * any Members API specific functionality into. If there is none in the nearest
 * future, it would make sense to remove it alltogether.
 * @constructor
 * @param {Object} app  Ghost express app instance
 * @param {Object} options
 * @param {String} options.apiURL
 * @param {String} options.originURL
 */
class MembersAPITestAgent extends TestAgent {
    #bootOptions = null;

    constructor(app, options) {
        super(app, options);
        this.#bootOptions = options;
    }

    duplicate() {
        return new MembersAPITestAgent(this.app, this.#bootOptions);
    }

    async loginAs(email) {
        const membersService = require('../../../core/server/services/members');
        const memberRepository = membersService.api.members;

        const member = await memberRepository.get({email});

        if (!member) {
            // Create the member first with context internal if it doesn't exist to prevent sending a signup email
            await memberRepository.create({name: '', email}, {context: {internal: true}});
        }

        const magicLink = await membersService.api.getMagicLink(email, 'signin');
        const magicLinkUrl = new URL(magicLink);
        const token = magicLinkUrl.searchParams.get('token');

        const res = await this.get(`/?token=${token}`);

        if (res.statusCode !== 302) {
            throw new errors.IncorrectUsageError({
                message: res.body.errors[0].message
            });
        }

        return res.headers['set-cookie'];
    }
}

module.exports = MembersAPITestAgent;
