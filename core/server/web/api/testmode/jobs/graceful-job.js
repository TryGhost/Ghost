const {parentPort} = require('bthreads');
const util = require('util');
const logging = require('../../../../../shared/logging');
const models = require('../../../../models');

let shutdown = false;

parentPort.on('message', (message) => {
    logging.info(`paret message received: ${message}`);

    if (message === 'cancel') {
        shutdown = true;
    }
});

const setTimeoutPromise = util.promisify(setTimeout);
const internalContext = {context: {internal: true}};

(async () => {
    try {
        await models.init();

        logging.info(`Fetching tags`);
        const tags = await models.Tag.findPage(internalContext);

        logging.info(`Found ${tags.data.length} tags. First one: ${tags.data[0].toJSON().slug}`);

        logging.info(`Waiting 5 seconds to perform second part of the job`);
        await setTimeoutPromise(5 * 1000);

        if (shutdown) {
            logging.info(`Job shutting down gracefully`);
            process.exit(0);
        }

        logging.info(`Fetching posts`);
        const posts = await models.Post.findPage(internalContext);

        logging.info(`Found ${posts.data.length} posts. First one: ${posts.data[0].toJSON().slug}`);

        logging.info('Graceful job has completed!');

        process.exit(0);
    } catch (err) {
        logging.error(err);
        process.exit(1);
    }
})();
