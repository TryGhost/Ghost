/**
 * We call notify server started when the server is ready to serve traffic
 * When the server is started, but not ready, it is only able to serve 503s
 *
 * If the server isn't able to reach started, notifyServerStarted is called with an error
 * A status message, any error, and debug info are all passed to managing processes via IPC and the bootstrap socket
 */

// Required Ghost internals
const config = require('../shared/config');
const logging = require('../shared/logging');

let notifyServerStartedCalled = false;

const debugInfo = {
    versions: process.versions,
    platform: process.platform,
    arch: process.arch,
    release: process.release
};

module.exports.notifyServerStarted = function (error = null) {
    // If we already sent a ready notification, we should not do it again
    if (notifyServerStartedCalled) {
        return Promise.resolve();
    }

    // Mark this function as called
    notifyServerStartedCalled = true;

    // Build our message
    // - if there's no error then the server is ready
    let message = {
        started: true,
        debug: debugInfo
    };

    // - if there's an error then the server is not ready, include the errors
    if (error) {
        message.started = false;
        message.error = error;
    }

    // CASE: IPC communication to the CLI for local process manager
    if (process.send) {
        process.send(message);
    }

    // CASE: use bootstrap socket to communicate with CLI for systemd
    let socketAddress = config.get('bootstrap-socket');
    if (socketAddress) {
        const bootstrapSocket = require('@tryghost/bootstrap-socket');
        return bootstrapSocket.connectAndSend(socketAddress, logging, message);
    }

    return Promise.resolve();
};
