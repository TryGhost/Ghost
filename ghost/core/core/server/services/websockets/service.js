const {Server} = require('socket.io');
const debug = require('@tryghost/debug')('websockets');
const logging = require('@tryghost/logging');

const labs = require('../../../shared/labs');

module.exports = {
    async init(ghostServer) {
        debug(`[Websockets] Is labs set? ${labs.isSet('websockets')}`);

        if (labs.isSet('websockets')) {
            logging.info(`Starting websockets service`);

            const io = new Server(ghostServer.httpServer);
            let count = 0;

            io.on(`connection`, (socket) => {
                logging.info(`Websockets client connected (id: ${socket.id})`);

                // on connect, send current value
                socket.emit('addCount', count);
                // listen to to changes in value from client
                socket.on('addCount', () => {
                    count = count + 1;
                    debug(`[Websockets] received addCount from client, count is now ${count}`);
                    socket.broadcast.emit('addCount', count);
                });
            });

            ghostServer.registerCleanupTask(async () => {
                logging.warn(`Stopping websockets service`);
                await new Promise((resolve) => {
                    io.close(resolve);
                });
            });
        }
    }
};
