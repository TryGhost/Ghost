const {isMainThread, parentPort, workerData} = require('worker_threads');
const util = require('util');
const setTimeoutPromise = util.promisify(setTimeout);

const passTime = async (ms) => {
    if (Number.isInteger(ms)) {
        await setTimeoutPromise(ms);
    } else {
        await setTimeoutPromise(ms.ms);
    }
};

if (isMainThread) {
    module.exports = passTime;
} else {
    (async () => {
        await passTime(workerData.ms);
        parentPort.postMessage('done');
        // alternative way to signal "finished" work (not recommended)
        // process.exit();
    })();
}
