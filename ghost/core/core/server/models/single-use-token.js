const ghostBookshelf = require('./base');
const crypto = require('crypto');

const SingleUseToken = ghostBookshelf.Model.extend({
    tableName: 'tokens',

    defaults() {
        return {
            used_count: 0,
            token: crypto
                .randomBytes(192 / 8)
                .toString('base64')
                // base64url encoding means the tokens are URL safe
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
        };
    }
}, {});

const SingleUseTokens = ghostBookshelf.Collection.extend({
    model: SingleUseToken
});

module.exports = {
    SingleUseToken: ghostBookshelf.model('SingleUseToken', SingleUseToken),
    SingleUseTokens: ghostBookshelf.collection('SingleUseTokens', SingleUseTokens)
};
