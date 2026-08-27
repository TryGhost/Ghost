const logging = require('@tryghost/logging');
const models = require('../../../../models');
const postPresence = require('../../../../services/post-presence');
const permissionsService = require('../../../../services/permissions');
const {
  PRESENCE_EVENT_TYPES,
} = require('../../../../services/post-presence/post-presence-service');
const {
  hasElevatedPresenceAccess,
  canReceiveEvent,
} = require('../../../../services/post-presence/presence-permissions');

const KEEPALIVE_MS = 30 * 1000;

const MAX_STREAMS_PER_USER = 10;

// Open SSE streams per staff user. Request-rate limiting cannot bound these:
// each open stream holds a socket, a bus subscriber and a keepalive timer for
// as long as the tab lives. Process-local, like the presence state it guards.
const openStreamsByUser = new Map();

function countOpenStreams(userId) {
  return openStreamsByUser.get(userId) || 0;
}

function trackStream(userId) {
  if (userId) {
    openStreamsByUser.set(userId, countOpenStreams(userId) + 1);
  }
}

function untrackStream(userId) {
  if (!userId) {
    return;
  }
  const remaining = countOpenStreams(userId) - 1;
  if (remaining > 0) {
    openStreamsByUser.set(userId, remaining);
  } else {
    openStreamsByUser.delete(userId);
  }
}

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

function lookupErrorStatus(err) {
  if (!err) {
    return null;
  }
  const isForbidden = err.errorType === 'NoPermissionError' || err.statusCode === 403;
  const isNotFound = err.errorType === 'NotFoundError' || err.statusCode === 404;
  if (isForbidden) {
    return 403;
  }
  if (isNotFound) {
    return 404;
  }
  return null;
}

async function stream(req, res) {
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

  const userId = req.user && req.user.id;

  if (countOpenStreams(userId) >= MAX_STREAMS_PER_USER) {
    logging.warn({ userId }, 'presence-stream: concurrent stream limit reached');
    res.status(429).end();
    return;
  }

  try {
    openSse(res);
  } catch (err) {
    logging.warn({ err }, 'presence-stream: failed to write headers; client likely disconnected');
    return;
  }

  trackStream(userId);

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
    userId,
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
    untrackStream(userId);
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
}

async function enter(req, res) {
  try {
    if (req.api_key) {
      res.status(204).end();
      return;
    }
    const postId = req.params && req.params.id;
    const user = req.user;
    const missingEnterTarget = !postId || !user || !user.id;
    if (missingEnterTarget) {
      res.status(204).end();
      return;
    }

    let post;
    try {
      await permissionsService.canThis({ user: user.id }).edit.post(postId);
      post = await models.Post.findOne(
        { id: postId, status: 'all' },
        {
          context: { user: user.id },
          withRelated: ['authors'],
        },
      );
    } catch (err) {
      const status = lookupErrorStatus(err);
      if (status) {
        res.status(status).end();
        return;
      }
      logging.warn({ err, postId, userId: user.id }, 'presence-enter: post lookup failed');
      res.status(204).end();
      return;
    }
    if (!post) {
      res.status(404).end();
      return;
    }

    const authorIds = post.related('authors').map((author) => author.get('id'));
    postPresence.mark(
      postId,
      {
        id: user.id,
        name: user.get('name'),
        profileImage: user.get('profile_image'),
      },
      { authorIds },
    );
  } catch (err) {
    logging.warn({ err }, 'Failed to record presence enter');
  }
  res.status(204).end();
}

function leave(req, res) {
  try {
    if (req.api_key) {
      res.status(204).end();
      return;
    }
    const postId = req.params && req.params.id;
    const user = req.user;
    if (postId && user && user.id) {
      postPresence.leave(postId, user.id);
    }
  } catch (err) {
    logging.warn({ err }, 'Failed to record presence leave');
  }
  res.status(204).end();
}

module.exports = {
  stream,
  enter,
  leave,
  MAX_STREAMS_PER_USER,
};
