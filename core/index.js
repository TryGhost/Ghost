// ## Server Loader
// Passes options through the boot process to get a server instance back
const server = require('./server');
const common = require('./server/lib/common');
const GhostServer = require('./server/ghost-server');

// Set the default environment to be `development`
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

function makeGhost(options) {
    options = options || {};

    return server(options)
        .catch((err) => {
            if (!common.errors.utils.isIgnitionError(err)) {
                err = new common.errors.GhostError({message: err.message, err: err});
            }

            return GhostServer.announceServerStopped(err)
                .finally(() => {
                    throw err;
                });
        });
}

module.exports = makeGhost;
