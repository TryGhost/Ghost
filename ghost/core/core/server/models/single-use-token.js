module.exports = function (ghostBookshelf) {
    const crypto = require('crypto');

    const SingleUseToken = ghostBookshelf.Model.extend({
        tableName: 'tokens',

        defaults() {
            return {
                used_count: 0,
                otc_used_count: 0,
                uuid: crypto.randomUUID(),
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

    return {
        SingleUseToken: ghostBookshelf.model('SingleUseToken', SingleUseToken),
        SingleUseTokens: ghostBookshelf.collection('SingleUseTokens', SingleUseTokens)
    };
};

Object.assign(module.exports, module.exports(require('./base')));
