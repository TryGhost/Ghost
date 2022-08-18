const bcrypt = require('bcryptjs');

let HASH_ROUNDS = 10;

if (process.env.NODE_ENV?.startsWith('testing')) {
    HASH_ROUNDS = 1;
}

module.exports.hash = async function hash(plainPassword) {
    const salt = await bcrypt.genSalt(HASH_ROUNDS);
    return bcrypt.hash(plainPassword, salt);
};

module.exports.compare = function compare(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
};
