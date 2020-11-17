const util = require('util');
const setTimeoutPromise = util.promisify(setTimeout);

const passTime = async (ms) => {
    await setTimeoutPromise(ms);
    return 'done';
};

module.exports = passTime;
