const {parentPort} = require('worker_threads');
const util = require('util');

let shutdown = false;

const postParentPortMessage = (message) => {
    if (parentPort) {
        parentPort.postMessage(message);
    }
};

if (parentPort) {
    parentPort.on('message', (message) => {
        parentPort.postMessage(`parent message received: ${message}`);

        if (message === 'cancel') {
            shutdown = true;
        }
    });
}

const setTimeoutPromise = util.promisify(setTimeout);
const internalContext = {context: {internal: true}};

(async () => {
    const models = require('../../../../models');

    await models.init();

    postParentPortMessage(`Fetching tags`);
    const tags = await models.Tag.findPage(internalContext);

    postParentPortMessage(`Found ${tags.data.length} tags. First one: ${tags.data[0].toJSON().slug}`);

    postParentPortMessage(`Waiting 5 seconds to perform second part of the job`);
    await setTimeoutPromise(5 * 1000);

    if (shutdown) {
        postParentPortMessage(`Job shutting down gracefully`);
        parentPort.postMessage('done');
    }

    postParentPortMessage(`Fetching posts`);
    const posts = await models.Post.findPage(internalContext);

    postParentPortMessage(`Found ${posts.data.length} posts. First one: ${posts.data[0].toJSON().slug}`);
    postParentPortMessage('Graceful job has completed!');

    parentPort.postMessage('done');
})();
