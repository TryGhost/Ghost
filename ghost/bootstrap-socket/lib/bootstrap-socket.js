const logging = require('@tryghost/logging');

module.exports.connectAndSend = (socketAddress, message) => {
    // Very basic guard against bad calls
    if (!socketAddress || !socketAddress.host || !socketAddress.port || !logging || !logging.info || !logging.warn || !message) {
        return Promise.resolve();
    }

    const net = require('net');
    const client = new net.Socket();

    return new Promise((resolve) => {
        const connect = (options = {}) => {
            let wasResolved = false;

            const waitTimeout = setTimeout(() => {
                logging.info('Bootstrap socket timed out.');

                if (!client.destroyed) {
                    client.destroy();
                }

                if (wasResolved) {
                    return;
                }

                wasResolved = true;
                resolve();
            }, 1000 * 5);

            client.connect(socketAddress.port, socketAddress.host, () => {
                if (waitTimeout) {
                    clearTimeout(waitTimeout);
                }

                client.write(JSON.stringify(message));

                if (wasResolved) {
                    return;
                }

                wasResolved = true;
                resolve();
            });

            client.on('close', () => {
                logging.info('Bootstrap client was closed.');

                if (waitTimeout) {
                    clearTimeout(waitTimeout);
                }
            });

            client.on('error', (err) => {
                logging.warn(`Can't connect to the bootstrap socket (${socketAddress.host} ${socketAddress.port}) ${err.code}.`);

                client.removeAllListeners();

                if (waitTimeout) {
                    clearTimeout(waitTimeout);
                }

                if (options.tries < 3) {
                    logging.warn(`Tries: ${options.tries}`);

                    // retry
                    logging.warn('Retrying...');

                    options.tries = options.tries + 1;
                    const retryTimeout = setTimeout(() => {
                        clearTimeout(retryTimeout);
                        connect(options);
                    }, 150);
                } else {
                    if (wasResolved) {
                        return;
                    }

                    wasResolved = true;
                    resolve();
                }
            });
        };

        connect({tries: 0});
    });
};
