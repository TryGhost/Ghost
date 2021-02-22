const {parentPort} = require('bthreads');
const util = require('util');

let shutdown = false;

parentPort.on('message', (message) => {
    parentPort.postMessage(`parent message received: ${message}`);

    if (message === 'cancel') {
        shutdown = true;
    }
});

const setTimeoutPromise = util.promisify(setTimeout);
const internalContext = {context: {internal: true}};

(async () => {
    const models = require('../../../../models');

    await models.init();

    parentPort.postMessage(`Fetching tags`);
    const tags = await models.Tag.findPage(internalContext);

    parentPort.postMessage(`Found ${tags.data.length} tags. First one: ${tags.data[0].toJSON().slug}`);

    parentPort.postMessage(`Waiting 5 seconds to perform second part of the job`);
    await setTimeoutPromise(5 * 1000);

    if (shutdown) {
        parentPort.postMessage(`Job shutting down gracefully`);
        process.exit(0);
    }

    parentPort.postMessage(`Fetching posts`);
    const posts = await models.Post.findPage(internalContext);

    parentPort.postMessage(`Found ${posts.data.length} posts. First one: ${posts.data[0].toJSON().slug}`);

    parentPort.postMessage('Graceful job has completed!');

    process.exit(0);
})();
