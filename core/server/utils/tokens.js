var crypto = require('crypto');

exports.resetToken = {
    generateHash: function generateHash(options) {
        options = options || {};

        var hash = crypto.createHash('sha256'),
            expires = options.expires,
            email = options.email,
            dbHash = options.dbHash,
            password = options.password,
            text = '';

        hash.update(String(expires));
        hash.update(email.toLocaleLowerCase());
        hash.update(password);
        hash.update(String(dbHash));

        text += [expires, email, hash.digest('base64')].join('|');
        return new Buffer(text).toString('base64');
    },
    extract: function extract(options) {
        options = options || {};

        var token = options.token,
            tokenText = new Buffer(token, 'base64').toString('ascii'),
            parts,
            expires,
            email;

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

        var tokenToCompare = options.token,
            parts = exports.resetToken.extract({token: tokenToCompare}),
            dbHash = options.dbHash,
            password = options.password,
            generatedToken,
            diff = 0,
            i;

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
