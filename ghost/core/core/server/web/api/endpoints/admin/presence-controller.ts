import logging from '@tryghost/logging';
import type { Request, Response } from 'express';
import { z } from 'zod';

const models = require('../../../../models');
const postPresence = require('../../../../services/post-presence');
const permissionsService = require('../../../../services/permissions');
import type {
  PresencePostEvent,
  PresenceSnapshotPost,
  PresenceSnapshotEvent,
} from '../../../../services/post-presence/post-presence-service';
import { PRESENCE_EVENT_TYPES } from '../../../../services/post-presence/post-presence-service';
import {
  hasElevatedPresenceAccess,
  canReceiveEvent,
  type PresenceSubscriber,
} from '../../../../services/post-presence/presence-permissions';

const KEEPALIVE_MS = 30 * 1000;
export const MAX_STREAMS_PER_USER = 10;

const postIdSchema = z.string().min(1);
type PostId = z.infer<typeof postIdSchema>;

type StaffUser = {
  id: string;
  get: (key: string) => string | null | undefined;
  hasRole?: (role: string) => boolean;
  load?: (relations: string[]) => unknown;
};

type PresenceRequest<Params extends Record<string, string> = Record<string, string>> =
  Request<Params> & {
    api_key?: unknown;
    user?: StaffUser;
  };

type PresenceEvent = PresencePostEvent | PresenceSnapshotEvent;
type ClientPresenceEvent =
  | Omit<PresencePostEvent, 'authorIds'>
  | (Omit<PresenceSnapshotEvent, 'authorIds' | 'posts'> & {
      posts: Array<Omit<PresenceSnapshotPost, 'authorIds'>>;
    });

const SSE_HEADERS: Record<string, string> = {
  'Content-Type': 'text/event-stream',
  // no-transform skips Ghost's global gzip middleware; without it, events buffer
  // until the stream ends and presence is no longer real-time.
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
};

// Open SSE streams per staff user. Request-rate limiting cannot bound these:
// each open stream holds a socket, a bus subscriber and a keepalive timer for
// as long as the tab lives. Process-local, like the presence state it guards.
const openStreamsByUser = new Map<string, number>();

function countOpenStreams(userId: string): number {
  return openStreamsByUser.get(userId) || 0;
}

function trackStream(userId: string): void {
  if (userId) {
    openStreamsByUser.set(userId, countOpenStreams(userId) + 1);
  }
}

function untrackStream(userId: string): void {
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

function postIdFrom(req: PresenceRequest): PostId | null {
  const result = postIdSchema.safeParse(req.params?.id);
  return result.success ? result.data : null;
}

function withoutAuthorIds<T extends object>(item: T): Omit<T, 'authorIds'> {
  const copy = { ...item } as Omit<T, 'authorIds'>;
  delete (copy as { authorIds?: unknown }).authorIds;
  return copy;
}

function toClientEvent(event: PresenceEvent): ClientPresenceEvent {
  if (event.type === PRESENCE_EVENT_TYPES.SNAPSHOT) {
    return {
      type: event.type,
      posts: event.posts.map(withoutAuthorIds),
    };
  }
  return withoutAuthorIds(event);
}

function openSse(res: Response): void {
  res.writeHead(200, SSE_HEADERS);
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }
}

function lookupErrorStatus(err: unknown): number | null {
  if (!err || typeof err !== 'object') {
    return null;
  }
  const error = err as { errorType?: unknown; statusCode?: unknown };
  const isForbidden = error.errorType === 'NoPermissionError' || error.statusCode === 403;
  const isNotFound = error.errorType === 'NotFoundError' || error.statusCode === 404;
  if (isForbidden) {
    return 403;
  }
  if (isNotFound) {
    return 404;
  }
  return null;
}

export async function stream(req: PresenceRequest, res: Response): Promise<void> {
  if (req.api_key) {
    res.status(403).end();
    return;
  }

  try {
    if (req.user && typeof req.user.load === 'function') {
      await req.user.load(['roles']);
    }
  } catch (err) {
    logging.warn({ err }, 'presence-stream: failed to load user roles');
    res.status(500).end();
    return;
  }

  const userId = req.user?.id || '';

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

  const sendComment = (text: string): void => {
    if (closed) {
      return;
    }
    try {
      res.write(`: ${text}\n\n`);
    } catch (err) {
      logging.warn(
        { err, code: err && typeof err === 'object' && 'code' in err ? err.code : undefined },
        'presence-stream: keepalive write failed',
      );
    }
  };

  const sendEvent = (event: PresenceEvent): void => {
    if (closed) {
      return;
    }
    try {
      res.write(`data: ${JSON.stringify(toClientEvent(event))}\n\n`);
    } catch (err) {
      logging.warn(
        { err, code: err && typeof err === 'object' && 'code' in err ? err.code : undefined },
        'presence-stream: write failed',
      );
    }
  };

  const subscriber: PresenceSubscriber = {
    userId,
    elevated: hasElevatedPresenceAccess(req.user),
  };

  try {
    const visiblePosts = postPresence
      .snapshot()
      .filter((post: PresenceSnapshotPost) => canReceiveEvent(subscriber, post));
    sendEvent({ type: PRESENCE_EVENT_TYPES.SNAPSHOT, posts: visiblePosts });
  } catch (err) {
    logging.warn({ err }, 'presence-stream: failed to send initial snapshot');
  }

  const unsubscribe = postPresence.subscribe((event: PresencePostEvent) => {
    if (canReceiveEvent(subscriber, event)) {
      sendEvent(event);
    }
  });

  const keepalive = setInterval(() => sendComment('ping'), KEEPALIVE_MS);
  if (keepalive.unref) {
    keepalive.unref();
  }

  const cleanup = (): void => {
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

  // The client can disconnect while roles are loading above, in which case
  // 'close' already fired and the handlers registered here never will.
  if (req.destroyed || res.destroyed) {
    cleanup();
  }
}

export async function enter(req: PresenceRequest<{ id: PostId }>, res: Response): Promise<void> {
  try {
    if (req.api_key) {
      res.status(204).end();
      return;
    }
    const postId = postIdFrom(req);
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

    const authorIds = post
      .related('authors')
      .map((author: { get: (key: string) => string }) => author.get('id'));
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

export function leave(req: PresenceRequest<{ id: PostId }>, res: Response): void {
  try {
    if (req.api_key) {
      res.status(204).end();
      return;
    }
    const postId = postIdFrom(req);
    const user = req.user;
    if (postId && user && user.id) {
      postPresence.leave(postId, user.id);
    }
  } catch (err) {
    logging.warn({ err }, 'Failed to record presence leave');
  }
  res.status(204).end();
}
