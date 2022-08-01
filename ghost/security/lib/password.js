const bcrypt = require('bcryptjs');
module.exports.hash = async function hash(plainPassword) {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(plainPassword, salt);
};

module.exports.compare = function compare(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
};
