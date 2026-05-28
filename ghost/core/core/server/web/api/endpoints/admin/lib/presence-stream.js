const logging = require('@tryghost/logging');
const labs = require('../../../../../../shared/labs');
const postPresence = require('../../../../../services/post-presence');
const {PRESENCE_EVENT_TYPES} = require('../../../../../services/post-presence/post-presence-service');

const KEEPALIVE_MS = 30 * 1000;

/**
 * SSE handler for live presence updates. Holds a long-lived HTTP
 * response open, writes the current snapshot, then forwards every
 * presence event to the client. Auth handled upstream by mw.authAdminApi.
 */
module.exports = function presenceStream(req, res) {
    if (!labs.isSet('editorPresence')) {
        res.status(404).end();
        return;
    }

    try {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            // Disable response buffering on nginx; SSE needs to stream.
            'X-Accel-Buffering': 'no'
        });
        if (typeof res.flushHeaders === 'function') {
            res.flushHeaders();
        }
    } catch (err) {
        logging.warn({err}, 'presence-stream: failed to write headers; client likely disconnected');
        return;
    }

    let closed = false;

    const sendComment = (text) => {
        if (closed) {
            return;
        }
        try {
            res.write(`: ${text}\n\n`);
        } catch (err) {
            // Stream closed mid-write; the close handler will clean up.
        }
    };

    const sendEvent = (event) => {
        if (closed) {
            return;
        }
        try {
            res.write(`data: ${JSON.stringify(event)}\n\n`);
        } catch (err) {
            logging.warn({err, code: err && err.code}, 'presence-stream: write failed');
        }
    };

    try {
        sendEvent({type: PRESENCE_EVENT_TYPES.SNAPSHOT, posts: postPresence.snapshot()});
    } catch (err) {
        logging.warn({err}, 'presence-stream: failed to send initial snapshot');
    }

    const unsubscribe = postPresence.subscribe(sendEvent);

    // Comment frames keep idle proxies from dropping the connection.
    // EventSource ignores them on the client side.
    const keepalive = setInterval(() => sendComment('ping'), KEEPALIVE_MS);
    if (keepalive.unref) {
        keepalive.unref();
    }

    const cleanup = () => {
        if (closed) {
            return;
        }
        closed = true;
        clearInterval(keepalive);
        try {
            unsubscribe();
        } catch (err) {
            logging.warn({err}, 'presence-stream: unsubscribe failed');
        }
    };

    req.on('close', cleanup);
    req.on('error', cleanup);
    res.on('error', cleanup);
};
