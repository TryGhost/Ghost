const logging = require('@tryghost/logging');
const postPresence = require('../../../../../services/post-presence');
const {
  PRESENCE_EVENT_TYPES,
} = require('../../../../../services/post-presence/post-presence-service');
const {
  hasElevatedPresenceAccess,
  canReceiveEvent,
} = require('../../../../../services/post-presence/presence-permissions');

const KEEPALIVE_MS = 30 * 1000;

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  // no-transform skips Ghost's global gzip middleware; without it, events buffer
  // until the stream ends and presence is no longer real-time.
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
};

function withoutAuthorIds(item) {
  const copy = { ...item };
  delete copy.authorIds;
  return copy;
}

function toClientEvent(event) {
  const payload = withoutAuthorIds(event);
  if (payload.type === PRESENCE_EVENT_TYPES.SNAPSHOT) {
    payload.posts = payload.posts.map(withoutAuthorIds);
  }
  return payload;
}

function openSse(res) {
  res.writeHead(200, SSE_HEADERS);
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }
}

module.exports = async function presenceStream(req, res) {
  if (req.api_key) {
    res.status(403).end();
    return;
  }

  try {
    const canLoadRoles = req.user && typeof req.user.load === 'function';
    if (canLoadRoles) {
      await req.user.load(['roles']);
    }
  } catch (err) {
    logging.warn({ err }, 'presence-stream: failed to load user roles');
    res.status(500).end();
    return;
  }

  try {
    openSse(res);
  } catch (err) {
    logging.warn({ err }, 'presence-stream: failed to write headers; client likely disconnected');
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
      logging.warn({ err, code: err && err.code }, 'presence-stream: keepalive write failed');
    }
  };

  const sendEvent = (event) => {
    if (closed) {
      return;
    }
    try {
      res.write(`data: ${JSON.stringify(toClientEvent(event))}\n\n`);
    } catch (err) {
      logging.warn({ err, code: err && err.code }, 'presence-stream: write failed');
    }
  };

  const subscriber = {
    userId: req.user && req.user.id,
    elevated: hasElevatedPresenceAccess(req.user),
  };

  try {
    const visiblePosts = postPresence
      .snapshot()
      .filter((post) => canReceiveEvent(subscriber, post));
    sendEvent({ type: PRESENCE_EVENT_TYPES.SNAPSHOT, posts: visiblePosts });
  } catch (err) {
    logging.warn({ err }, 'presence-stream: failed to send initial snapshot');
  }

  const unsubscribe = postPresence.subscribe((event) => {
    if (canReceiveEvent(subscriber, event)) {
      sendEvent(event);
    }
  });

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
      logging.warn({ err }, 'presence-stream: unsubscribe failed');
    }
  };

  req.on('close', cleanup);
  req.on('error', cleanup);
  res.on('close', cleanup);
  res.on('error', cleanup);
};
