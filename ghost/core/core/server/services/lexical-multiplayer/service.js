const debug = require('@tryghost/debug')('lexical-multiplayer'); // eslint-disable-line no-unused-vars
const logging = require('@tryghost/logging');
const {getSession} = require('../auth/session/express-session');
const models = require('../../models');
const labs = require('../../../shared/labs');

let wss;

const onSocketError = (error) => {
    logging.error(error);
};

const onUnauthorized = (socket) => {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
};

const handleUpgrade = async (request, socket, head) => {
    socket.on('error', onSocketError);

    // make sure the request is on the supported path
    // TODO: check handling of subdirectories
    if (!request.url.startsWith('/ghost/api/admin/posts/multiplayer/')) {
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        socket.destroy();
        return;
    }

    // grab the session from the request
    const session = await getSession(request, {});
    if (!session || !session.user_id) {
        return onUnauthorized(socket);
    }

    // fetch the session's user from the db
    const user = await models.User.findOne({id: session.user_id});
    if (!user) {
        return onUnauthorized(socket);
    }
    request.user = user;

    // TODO: check if user has access to the post

    // TODO: (elsewhere) close websocket connections on logout
    // - probably need to create a map of sockets to users?

    socket.removeListener('error', onSocketError);

    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
};

let _enable;
let _disable;
let _isClosing = false;
let _closePromise;

module.exports = {
    async init(ghostServer) {
        _enable = async () => {
            if (_isClosing) {
                logging.info('Waiting for previous Lexical multiplayer websockets service to close');
                await _closePromise;
            }

            if (wss) {
                logging.info('Lexical multiplayer websockets service already started');
                return;
            }

            if (labs.isSet('lexicalMultiplayer')) {
                logging.info('Starting lexical multiplayer websockets service');

                // TODO: can we use or adapt patterns from https://github.com/HenningM/express-ws?
                const WS = require('ws');
                wss = new WS.Server({noServer: true});
                const {setupWSConnection} = require('./y-websocket');

                wss.on('connection', (socket, request) => {
                    socket.on('error', onSocketError);

                    // TODO: better method for extracting doc name from URL
                    const docName = request.url.replace('/ghost/api/admin/posts/multiplayer/', '');
                    setupWSConnection(socket, request, {docName});
                });

                // TODO: this should probably be at a higher level, especially if we
                // want to support multiple websocket services
                ghostServer.httpServer.on('upgrade', handleUpgrade);
            }
        };

        _disable = async () => {
            logging.info('Stopping lexical multiplayer websockets service');
            ghostServer.httpServer.off('upgrade', handleUpgrade);

            if (wss) {
                _isClosing = true;
                _closePromise = new Promise((resolve) => {
                    // first sweep, soft close
                    wss.clients.forEach((socket) => {
                        socket.close();
                    });

                    setTimeout(() => {
                        // second sweep, hard close
                        wss.clients.forEach((socket) => {
                            if ([socket.OPEN, socket.CLOSING].includes(socket.readyState)) {
                                socket.terminate();
                            }
                        });

                        resolve();
                    }, 5000);
                }).finally(() => {
                    wss = null;
                    _isClosing = false;
                });

                return _closePromise;
            }
        };
    },

    async enable() {
        if (!_enable) {
            logging.error('Lexical multiplayer service must be initialized before it can be enabled/disabled');
            return;
        }
        return _enable();
    },

    async disable() {
        if (!_enable) {
            logging.error('Lexical multiplayer service must be initialized before it can be enabled/disabled');
            return;
        }
        return _disable();
    }
};
