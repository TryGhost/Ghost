const crypto = require('crypto');

module.exports.generateFromContent = function generateFromContent(options) {
    options = options || {};

    const hash = crypto.createHash('sha256');
    const content = options.content;

    let text = '';

    hash.update(content);

    text += [content, hash.digest('base64')].join('|');
    return Buffer.from(text).toString('base64');
};

module.exports.generateFromEmail = function generateFromEmail(options) {
    options = options || {};

    const hash = crypto.createHash('sha256');
    const expires = options.expires;
    const email = options.email;
    const secret = options.secret;

    let text = '';

    hash.update(String(expires));
    hash.update(email.toLocaleLowerCase());
    hash.update(String(secret));

    text += [expires, email, hash.digest('base64')].join('|');
    return Buffer.from(text).toString('base64');
};

module.exports.resetToken = {
    generateHash: function generateHash(options) {
        options = options || {};

        const hash = crypto.createHash('sha256');
        const expires = options.expires;
        const email = options.email;
        const dbHash = options.dbHash;
        const password = options.password;
        let text = '';

        hash.update(String(expires));
        hash.update(email.toLocaleLowerCase());
        hash.update(password);
        hash.update(String(dbHash));

        text += [expires, email, hash.digest('base64')].join('|');
        return Buffer.from(text).toString('base64');
    },
    extract: function extract(options) {
        options = options || {};

        const token = options.token;
        const tokenText = Buffer.from(token, 'base64').toString('ascii');
        let parts;
        let expires;
        let email;

        parts = tokenText.split('|');

        // Check if invalid structure
        if (!parts || parts.length !== 3) {
            return false;
        }

        expires = parseInt(parts[0], 10);
        email = parts[1];

        return {
            expires: expires,
            email: email
        };
    },
    compare: function compare(options) {
        options = options || {};

        const tokenToCompare = options.token;
        const parts = exports.resetToken.extract({token: tokenToCompare});
        const dbHash = options.dbHash;
        const password = options.password;
        let generatedToken;
        let diff = 0;
        let i;

        if (isNaN(parts.expires)) {
            return false;
        }

        // Check if token is expired to prevent replay attacks
        if (parts.expires < Date.now()) {
            return false;
        }

        generatedToken = exports.resetToken.generateHash({
            email: parts.email,
            expires: parts.expires,
            dbHash: dbHash,
            password: password
        });

        if (tokenToCompare.length !== generatedToken.length) {
            diff = 1;
        }

        for (i = tokenToCompare.length - 1; i >= 0; i = i - 1) {
            diff |= tokenToCompare.charCodeAt(i) ^ generatedToken.charCodeAt(i);
        }

        return diff === 0;
    }
};
