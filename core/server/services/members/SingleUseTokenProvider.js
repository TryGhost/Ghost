// @ts-check
const {UnauthorizedError} = require('@tryghost/errors');

class SingleUseTokenProvider {
    /**
     * @param {import('../../models/base')} SingleUseTokenModel - A model for creating and retrieving tokens.
     * @param {number} validity - How long a token is valid for from it's creation in milliseconds.
     */
    constructor(SingleUseTokenModel, validity) {
        this.model = SingleUseTokenModel;
        this.validity = validity;
    }

    /**
     * @method create
     * Creates and stores a token, with the passed data associated with it.
     * Returns the created token value.
     *
     * @param {Object<string, any>} data
     *
     * @returns {Promise<string>}
     */
    async create(data) {
        const model = await this.model.add({
            data: JSON.stringify(data)
        });

        return model.get('token');
    }

    /**
     * @method validate
     * Validates a token, returning any parsable data associated.
     * If the token is invalid the returned Promise will reject.
     *
     * @param {string} token
     *
     * @returns {Promise<Object<string, any>>}
     */
    async validate(token) {
        const model = await this.model.findOne({token});

        if (!model) {
            throw new UnauthorizedError({
                message: 'Invalid token provided'
            });
        }

        const createdAtEpoch = model.get('created_at').getTime();

        const tokenLifetimeMilliseconds = Date.now() - createdAtEpoch;

        if (tokenLifetimeMilliseconds > this.validity) {
            throw new UnauthorizedError({
                message: 'Token expired'
            });
        }

        try {
            return JSON.parse(model.get('data'));
        } catch (err) {
            return {};
        }
    }
}

module.exports = SingleUseTokenProvider;
