const logging = require('../../../../../shared/logging');

(async () => {
    let sum = 0;

    logging.info(`Starting CPU intensive task at ${new Date()}`);

    for (let i = 0; i < 100000000; i++) {
        sum += Math.tan(Math.tan(i));
    }

    logging.info(`Calculation result: ${sum}`);

    logging.info(`Finishing CPU intensive task at ${new Date()}`);
})();
