// ## Server Loader
// Passes options through the boot process to get a server instance back
const server = require('./server');

// Set the default environment to be `development`
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

function makeGhost(options = {}) {
    return server(options);
}

module.exports = makeGhost;
