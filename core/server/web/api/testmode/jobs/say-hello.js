const logging = require('../../../../../shared/logging');

const helloJob = () => {
    logging.info('Starting hello job');

    logging.info('Gonna say "hi" in 5 seconds');

    return new Promise((resolve) => {
        setTimeout(() => {
            logging.info('hi!');
            logging.info('Ending hello job run.');
            resolve();
        }, 5 * 1000);
    });
};

module.exports = helloJob;
