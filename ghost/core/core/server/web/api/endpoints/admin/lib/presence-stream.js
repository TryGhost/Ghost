const logging = require('@tryghost/logging');
const labs = require('../../../../../../shared/labs');
const postPresence = require('../../../../../services/post-presence');
const {PRESENCE_EVENT_TYPES} = require('../../../../../services/post-presence/post-presence-service');
const {
    hasElevatedPresenceAccess,
    canReceiveEvent
} = require('../../../../../services/post-presence/presence-permissions');

const KEEPALIVE_MS = 30 * 1000;

/**
 * SSE handler that streams presence events to a single admin tab.
 * Events are filtered per-subscriber so Author/Contributor only see
 * events for posts they're listed as authors on; Editor+ see all.
 */
module.exports = async function presenceStream(req, res) {
    if (!labs.isSet('editorPresence')) {
        res.status(404).end();
        return;
    }

    // Session middleware loads req.user without roles. Force-load
    // them once at connect so hasElevatedPresenceAccess can resolve
    // the user's role for per-event filtering.
    if (req.user && typeof req.user.load === 'function') {
        try {
            await req.user.load(['roles']);
        } catch (err) {
            logging.warn({err}, 'presence-stream: failed to load user roles');
            res.status(500).end();
            return;
        }
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
            logging.warn({err, code: err && err.code}, 'presence-stream: keepalive write failed');
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

    // Per-subscriber permission context, captured once at connect.
    // Elevated roles (Owner/Admin/Super Editor/Editor) receive every
    // event. Author/Contributor only receive events for posts where
    // their user.id appears in the event's authorIds. This is the
    // hard filter that keeps post IDs and activity from leaking
    // across the role boundary via the SSE stream.
    const subscriber = {
        userId: req.user && req.user.id,
        elevated: hasElevatedPresenceAccess(req.user)
    };

    try {
        const filteredPosts = postPresence.snapshot().filter(post => canReceiveEvent(subscriber, post));
        sendEvent({type: PRESENCE_EVENT_TYPES.SNAPSHOT, posts: filteredPosts});
    } catch (err) {
        logging.warn({err}, 'presence-stream: failed to send initial snapshot');
    }

    const forwardEvent = (event) => {
        if (!canReceiveEvent(subscriber, event)) {
            return;
        }
        sendEvent(event);
    };
    const unsubscribe = postPresence.subscribe(forwardEvent);

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
    res.on('close', cleanup);
    res.on('error', cleanup);
};
