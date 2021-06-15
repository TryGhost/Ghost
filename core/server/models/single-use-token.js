const ghostBookshelf = require('./base');
const crypto = require('crypto');
const logging = require('@tryghost/logging');

const SingleUseToken = ghostBookshelf.Model.extend({
    tableName: 'tokens',

    defaults() {
        return {
            token: crypto
                .randomBytes(192 / 8)
                .toString('base64')
                // base64url encoding means the tokens are URL safe
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
        };
    }
}, {
    async findOne(data, unfilteredOptions = {}) {
        const model = await ghostBookshelf.Model.findOne.call(this, data, unfilteredOptions);

        if (model) {
            setTimeout(async () => {
                try {
                    await this.destroy(Object.assign({
                        destroyBy: {
                            id: model.id
                        }
                    }, {
                        ...unfilteredOptions,
                        transacting: null
                    }));
                } catch (err) {
                    logging.error(err);
                }
            }, 10000);
        }

        return model;
    }
});

const SingleUseTokens = ghostBookshelf.Collection.extend({
    model: SingleUseToken
});

module.exports = {
    SingleUseToken: ghostBookshelf.model('SingleUseToken', SingleUseToken),
    SingleUseTokens: ghostBookshelf.collection('SingleUseTokens', SingleUseTokens)
};
