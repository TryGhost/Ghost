const bcrypt = require('bcryptjs');

let hashTotal = 0;
let hashCount = 0;

let compareTotal = 0;
let compareCount = 0;

module.exports.hash = async function hash(plainPassword) {
    hashCount += 1;
    const now = Date.now();

    const salt = await bcrypt.genSalt(1);
    const res = await bcrypt.hash(plainPassword, salt);
    hashTotal += (Date.now() - now);
    console.log(`hash: ${hashCount} executions = ${hashTotal}ms (average = ${Math.round(hashTotal / hashCount)}ms)`);
    return res;
};

module.exports.compare = async function compare(plainPassword, hashedPassword) {
    compareCount += 1;
    const now = Date.now();

    const res = await bcrypt.compare(plainPassword, hashedPassword);
    compareTotal += (Date.now() - now);
    console.log(`compare: ${compareCount} executions = ${compareTotal}ms (average = ${Math.round(compareTotal / compareCount)}ms)`);

    return res;
};
