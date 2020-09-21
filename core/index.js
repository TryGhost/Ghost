// ## Server Loader
// Passes options through the boot process to get a server instance back
const server = require('./server');
const errors = require('@tryghost/errors');
const GhostServer = require('./server/ghost-server');

// Set the default environment to be `development`
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

function makeGhost(options) {
    options = options || {};

    return server(options)
        .catch((err) => {
            if (!errors.utils.isIgnitionError(err)) {
                err = new errors.GhostError({message: err.message, err: err});
            }

            return GhostServer.announceServerReadiness(err)
                .finally(() => {
                    throw err;
                });
        });
}

module.exports = makeGhost;
