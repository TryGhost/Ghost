const ghostBookshelf = require('./base');
const crypto = require('crypto');

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
        if (!unfilteredOptions.transacting) {
            return ghostBookshelf.transaction((transacting) => {
                return this.findOne(data, Object.assign({transacting}, unfilteredOptions));
            });
        }
        const model = await ghostBookshelf.Model.findOne.call(this, data, unfilteredOptions);

        if (model) {
            await this.destroy(Object.assign({
                destroyBy: {
                    id: model.id
                }
            }, unfilteredOptions));
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
