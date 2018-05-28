const Promise = require('bluebird');

module.exports.hash = function hash(plainPassword) {
    const bcrypt = require('bcryptjs'),
        bcryptGenSalt = Promise.promisify(bcrypt.genSalt),
        bcryptHash = Promise.promisify(bcrypt.hash);

    return bcryptGenSalt().then(function (salt) {
        return bcryptHash(plainPassword, salt);
    });
};

module.exports.compare = function compare(plainPassword, hashedPassword) {
    const bcrypt = require('bcryptjs'),
        bcryptCompare = Promise.promisify(bcrypt.compare);

    return bcryptCompare(plainPassword, hashedPassword);
};
