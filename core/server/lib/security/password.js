const bcrypt = require('bcryptjs'),
    bcryptGenSalt = Promise.promisify(bcrypt.genSalt),
    bcryptHash = Promise.promisify(bcrypt.hash),
    bcryptCompare = Promise.promisify(bcrypt.compare);

module.exports.hash = function hash(plainPassword) {
    return bcryptGenSalt().then(function (salt) {
        return bcryptHash(plainPassword, salt);
    });
};

module.exports.compare = bcryptCompare;
