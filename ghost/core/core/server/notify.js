/**
 * We call notify server started when the server is ready to serve traffic
 * When the server is started, but not ready, it is only able to serve 503s
 *
 * If the server isn't able to reach started, notifyServerStarted is called with an error
 * A status message, any error, and debug info are all passed to managing processes via IPC and the bootstrap socket
 */

// Required Ghost internals
const config = require('../shared/config');

let notified = {
    started: false,
    ready: false
};

const debugInfo = {
    versions: process.versions,
    platform: process.platform,
    arch: process.arch,
    release: process.release
};

async function notify(type, error = null) {
    // If we already sent this notification, we should not do it again
    if (notified[type]) {
        return;
    }

    // Mark this function as called
    notified[type] = true;

    // Build our message
    // - if there's an error then the server is not ready, include the errors
    // - if there's no error then the server has started
    let message = {};
    if (error) {
        message[type] = false;
        message.error = error;
    } else {
        message[type] = true;
    }
    // Add debug info to the message
    message.debug = debugInfo;

    // CASE: IPC communication to the CLI for local process manager
    if (process.send) {
        process.send(message);
    }

    // CASE: use bootstrap socket to communicate with CLI for systemd
    let socketAddress = config.get('bootstrap-socket');
    if (socketAddress) {
        const bootstrapSocket = require('./lib/bootstrap-socket');
        return bootstrapSocket.connectAndSend(socketAddress, message);
    }

    return Promise.resolve();
}

module.exports.notifyServerStarted = async function (error = null) {
    return await notify('started', error);
};

module.exports.notifyServerReady = async function (error = null) {
    return await notify('ready', error);
};
