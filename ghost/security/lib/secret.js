const crypto = require('crypto');

/*
 * Uses birthday problem estimation to calculate chance of collision
 * d = 16^26        // 26 char hex string
 * n = 10,000,000   // 10 million
 *
 *       (-n x (n-1)) / 2d
 * 1 - e^
 *
 *
 *           17
 * ~= 4 x 10^
 *
 * ref: https://medium.freecodecamp.org/how-long-should-i-make-my-api-key-833ebf2dc26f
 * ref: https://en.wikipedia.org/wiki/Birthday_problem#Approximations
 *
 * 26 char hex string = 13 bytes (content api)
 * 64 char hex string JWT secret = 32 bytes (admin api / default)
 *
 * @param {String|Number} [typeOrLength=64]
 * @returns
 */
module.exports.create = (typeOrLength) => {
    let bytes;
    let length;

    if (Number.isInteger(typeOrLength)) {
        bytes = Math.ceil(typeOrLength / 2);
        length = typeOrLength;
    } else if (typeOrLength === 'content') {
        bytes = 13;
        length = 26;
    } else {
        bytes = 32;
        length = 64;
    }

    return crypto.randomBytes(bytes).toString('hex').slice(0, length);
};
