const crypto = require('crypto');

function hash(...args) {
    const data = args.reduce((prev, next) => prev + next, '');
    return crypto.createHash('sha256').update(data).digest('hex');
}

module.exports.hash = hash;
