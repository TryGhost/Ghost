const util = require('util');
const setTimeoutPromise = util.promisify(setTimeout);

const passTime = async (ms) => {
    if (Number.isInteger(ms)) {
        await setTimeoutPromise(ms);
    } else {
        await setTimeoutPromise(ms.ms);
    }

    return 'done';
};

module.exports = passTime;
