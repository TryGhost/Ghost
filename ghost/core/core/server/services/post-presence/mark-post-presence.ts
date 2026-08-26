import logging from '@tryghost/logging';
import { PostPresenceService } from './post-presence-service';

const postPresence = require('./index') as PostPresenceService;

type StaffUser = {
  id: string;
  get: (key: string) => unknown;
};

type ApiFrame = {
  user?: StaffUser;
  options?: {
    context?: {
      api_key?: unknown;
    };
  };
};

type PostAuthor = {
  id?: string | null;
};

type PostData = {
  id?: string;
  authors?: PostAuthor[] | null;
};

type PostLike = PostData & {
  toJSON?: () => PostData;
};

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function getPostData(post: PostLike | null | undefined): PostData | null {
  if (!post) {
    return null;
  }
  if (typeof post.toJSON === 'function') {
    return post.toJSON();
  }
  return post;
}

function authorIdsFrom(postData: PostData): { authorIds: string[] } | undefined {
  if (!Array.isArray(postData.authors)) {
    return undefined;
  }
  return {
    authorIds: postData.authors
      .map((author) => author?.id)
      .filter((id): id is string => Boolean(id)),
  };
}

function staffFromFrame(user: StaffUser) {
  return {
    id: user.id,
    name: asString(user.get('name')),
    profileImage: asNullableString(user.get('profile_image')),
  };
}

export function markPostPresence(
  frame: ApiFrame | null | undefined,
  post: PostLike | null | undefined,
): void {
  try {
    const isApiToken = Boolean(frame?.options?.context?.api_key);
    if (!frame?.user || !post || isApiToken) {
      return;
    }

    const postData = getPostData(post);
    if (!postData?.id) {
      return;
    }

    postPresence.mark(postData.id, staffFromFrame(frame.user), authorIdsFrom(postData));
  } catch (err) {
    logging.warn({ err }, 'Failed to record post presence');
  }
}
